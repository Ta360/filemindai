# One-time setup: Azure Container Apps

This provisions a **new** Azure Container App (`gdrive-llm-container`), separate
from the existing Web Apps (`gdrive-llm-tanmoy`, `gdrive-llm-charts`). After
this setup, every push to `main` triggers
[.github/workflows/azure-container-app.yml](.github/workflows/azure-container-app.yml),
which builds the root [Dockerfile](Dockerfile) and redeploys it.

Run every command below yourself, from a machine with the [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli)
installed and `az login` already done. Nothing here can be run on your behalf —
it creates real billable resources and app registrations in your subscription.

## 1. Variables

```bash
RG=gdrive-llm-container-rg
LOCATION=eastus
ACR_NAME=gdrivellmacr          # must be globally unique, alnum only
ENV_NAME=gdrive-llm-container-env
APP_NAME=gdrive-llm-container
```

## 2. Resource group + Azure Container Registry

```bash
az group create --name $RG --location $LOCATION

az acr create --resource-group $RG --name $ACR_NAME --sku Basic --admin-enabled false
```

## 3. Container Apps environment + the app itself

The app needs your backend's real env vars (same ones as `backend/.env`) to
actually work — set them with `--env-vars`, or add them later in the Portal
under the app's "Containers" > "Environment variables" blade. Start it on a
placeholder public image; the GitHub Actions workflow will overwrite it with
your real build on the first push.

```bash
az extension add --name containerapp --upgrade

az containerapp env create \
  --name $ENV_NAME \
  --resource-group $RG \
  --location $LOCATION

az containerapp create \
  --name $APP_NAME \
  --resource-group $RG \
  --environment $ENV_NAME \
  --image mcr.microsoft.com/k8se/quickstart:latest \
  --target-port 4000 \
  --ingress external \
  --min-replicas 1 --max-replicas 1
```

Grab the app's public URL:

```bash
az containerapp show --name $APP_NAME --resource-group $RG \
  --query properties.configuration.ingress.fqdn -o tsv
```

## 4. Let the Container App pull from the ACR

```bash
ACR_ID=$(az acr show --name $ACR_NAME --query id -o tsv)
APP_IDENTITY=$(az containerapp identity assign --name $APP_NAME --resource-group $RG \
  --system-assigned --query principalId -o tsv)

az role assignment create \
  --assignee $APP_IDENTITY \
  --role AcrPull \
  --scope $ACR_ID

az containerapp registry set \
  --name $APP_NAME --resource-group $RG \
  --server $ACR_NAME.azurecr.io \
  --identity system
```

## 5. Service principal for GitHub Actions (OIDC, no stored secret)

```bash
SUB_ID=$(az account show --query id -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)

APP_ID=$(az ad app create --display-name "gdrive-llm-container-gha" --query appId -o tsv)
az ad sp create --id $APP_ID

# Let the identity push images to the registry
az role assignment create --assignee $APP_ID --role AcrPush \
  --scope $ACR_ID

# Let the identity deploy new revisions to the Container App
CONTAINERAPP_ID=$(az containerapp show --name $APP_NAME --resource-group $RG --query id -o tsv)
az role assignment create --assignee $APP_ID --role Contributor \
  --scope $CONTAINERAPP_ID

# Federated credential so GitHub Actions can log in without a stored secret
az ad app federated-credential create --id $APP_ID --parameters '{
  "name": "gdrive-llm-container-main",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:<your-github-org>/<your-repo>:ref:refs/heads/main",
  "audiences": ["api://AzureADTokenExchange"]
}'

echo "AZURE_CONTAINERAPP_CLIENT_ID=$APP_ID"
echo "AZURE_CONTAINERAPP_TENANT_ID=$TENANT_ID"
echo "AZURE_CONTAINERAPP_SUBSCRIPTION_ID=$SUB_ID"
```

Replace `<your-github-org>/<your-repo>` with this repo's actual `owner/name`
before running the federated-credential command.

## 6. Add the GitHub repo secrets

In the GitHub repo: **Settings > Secrets and variables > Actions > New repository secret**,
add the three values printed at the end of step 5:

- `AZURE_CONTAINERAPP_CLIENT_ID`
- `AZURE_CONTAINERAPP_TENANT_ID`
- `AZURE_CONTAINERAPP_SUBSCRIPTION_ID`

## 7. Push to main

The workflow builds the Dockerfile, pushes to `$ACR_NAME.azurecr.io`, and
updates the Container App to the new image. Watch it run under the repo's
**Actions** tab, then hit the FQDN from step 3.

## Notes

- The backend reads its port from `PORT` (defaults to 4000, see
  [backend/src/config/env.ts](backend/src/config/env.ts)) — the container
  target port above is set to match (4000), not 5000.
- This app has no database volume like the VPS deploy does (see [DEPLOY.md](DEPLOY.md)) —
  Container Apps' filesystem is ephemeral per revision. If you need the
  SQLite data to persist across deploys, mount an Azure Files share via
  `az containerapp env storage set` before relying on this in production.
- Set the real secrets (`SESSION_SECRET`, `OPENAI_API_KEY`, etc.) as Container
  App env vars — either `az containerapp update --set-env-vars KEY=VALUE ...`
  or the Portal — they are **not** read from `backend/.env` inside the image.
