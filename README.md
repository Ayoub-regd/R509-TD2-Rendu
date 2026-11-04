# R509 - TD2 : Du Compose à Kubernetes pas à pas

## Objectif

Ce TD porte sur le déploiement d'une application web et d'une base de données PostgreSQL avec Docker Compose, puis Kubernetes.

L'environnement utilisé est Ubuntu sous WSL2, Docker, Minikube et kubectl.

## 1. Application

L'application comporte deux services :

- `web` : application Node.js utilisant le port 5000.
- `db` : base PostgreSQL 15 utilisant le port 5432.

L'application web interroge PostgreSQL et retourne un résultat au format JSON.

Les fichiers correspondants sont :

- `docker-compose.yml`
- `Dockerfile`
- `package.json`
- `server.js`

## 2. Docker Compose

Le fichier `docker-compose.yml` décrit les services web et db, leurs variables d'environnement et le volume utilisé par PostgreSQL.

Le service web dépend de la disponibilité de la base de données.

Le fichier Compose attend deux variables de mot de passe : `DB_PASS` et `POSTGRES_PASSWORD`. Pour **vérifier la syntaxe** de Compose sans publier de mot de passe dans le dépôt :

```bash
read -r -s -p "Mot de passe de test : " TD2_DB_PASSWORD
printf '\n'
DB_PASS="$TD2_DB_PASSWORD" POSTGRES_PASSWORD="$TD2_DB_PASSWORD" docker compose config --quiet
unset TD2_DB_PASSWORD
```

Cette commande valide la configuration ; elle ne constitue pas une preuve d'exécution des services Compose.

## 3. Passage à Kubernetes

Le déploiement est réalisé dans le namespace `r509-td2`.

Les manifestes sont présents dans le dossier `k8s/`.

| Fichier | Fonction |
|---|---|
| 00-namespace.yaml | Création du namespace |
| 01-web-config.yaml | Configuration de l'application |
| 02-db-deploy.yaml | Deployment PostgreSQL |
| 03-db-svc.yaml | Service interne PostgreSQL |
| 04-web-deploy.yaml | Deployment web, deux réplicas |
| 05-web-svc.yaml | Service web NodePort |

## 4. Commandes de déploiement

Pour reproduire le déploiement dans Minikube :

```bash
minikube start

docker build -t demo-web:1.0 .

minikube image load demo-web:1.0

kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-web-config.yaml
```

Sur un **nouveau cluster**, le Secret `db-secret` doit être créé dans le namespace **avant** d'appliquer les Deployments. Il fournit les clés `POSTGRES_PASSWORD` et `DB_PASS`, avec le même mot de passe :

```bash
read -r -s -p "Mot de passe PostgreSQL : " TD2_DB_PASSWORD
printf '\n'
kubectl -n r509-td2 create secret generic db-secret \
  --from-literal=POSTGRES_PASSWORD="$TD2_DB_PASSWORD" \
  --from-literal=DB_PASS="$TD2_DB_PASSWORD" \
  --dry-run=client -o yaml | kubectl apply -f -
unset TD2_DB_PASSWORD
```

Ce Secret est stocké dans Kubernetes : aucun fichier contenant son véritable mot de passe n'est versionné dans Git. Les commandes ci-dessus servent à **reproduire** le TD sur un cluster neuf ; elles ne décrivent pas nécessairement l'ordre historique des opérations effectuées pendant le TP.

Après sa création :

```bash
kubectl apply -f k8s/02-db-deploy.yaml
kubectl apply -f k8s/03-db-svc.yaml
kubectl apply -f k8s/04-web-deploy.yaml
kubectl apply -f k8s/05-web-svc.yaml
```

## 5. Vérification Kubernetes

Commandes permettant d'inspecter les ressources :

```bash
kubectl get pods -n r509-td2
kubectl get deployments -n r509-td2
kubectl get services -n r509-td2
kubectl get configmap -n r509-td2
kubectl get secret -n r509-td2
kubectl get all -n r509-td2 -o wide
```

Résultat observé lors du TD :

- Un Pod PostgreSQL en état Running.
- Deux Pods web en état Running.
- Deployment db : 1/1.
- Deployment web : 2/2.
- Service db : ClusterIP sur le port 5432.
- Service web : NodePort sur le port 5000.

## 6. Vérification PostgreSQL

Commande utilisée pour interroger la base :

```bash
kubectl -n r509-td2 exec deployment/db -- \
  psql -U app -d appdb \
  -tAc "SELECT current_database(), current_user;"
```

Résultat obtenu :

```text
appdb|app
```

## 7. Vérification du service web

Commande permettant d'obtenir l'adresse du service :

```bash
minikube service web -n r509-td2 --url
```

Au moment du test, l'application répondait avec le statut HTTP 200.

La réponse JSON contenait notamment :

```json
{
  "status": "ok",
  "application": "TD2 R509"
}
```

Elle comportait également les informations retournées par PostgreSQL.

## 8. Observation avec Lens

Le cluster Minikube a été ouvert dans Lens Desktop.

Le namespace `r509-td2` affichait trois Pods en état Running, sans redémarrage au moment de la capture.

Les captures correspondantes figurent dans le dossier `captures/`.

## 9. Différences entre Compose et Kubernetes

Docker Compose permet de définir et d'exécuter plusieurs services à partir d'un seul fichier de configuration.

Kubernetes utilise notamment :

- Les Deployments pour gérer les Pods et leurs réplicas.
- Les Services pour assurer les communications réseau.
- Les ConfigMaps pour les paramètres non sensibles.
- Les Secrets pour les informations sensibles.

Le manifeste PostgreSQL du TD utilise un volume `emptyDir`. Les données ne sont donc pas conservées après suppression du Pod. Un PVC serait nécessaire pour disposer d'un stockage persistant adapté.

## 10. Conclusion

Le déploiement Kubernetes fonctionne avec un Pod PostgreSQL et deux Pods web. Les tests HTTP et SQL confirment la communication entre les deux services.

Les commandes kubectl et les captures Lens permettent de vérifier l'état des ressources.

Le dépôt GitHub contient 16 fichiers suivis, dont six manifestes YAML et quatre captures PNG. L'archive `R509_TD2_REMISE_SIMPLE.zip` reprend ces 16 fichiers. Le compte rendu PDF est remis séparément ; il reproduit les quatre captures du dépôt et présente trois vues complémentaires de Lens et du navigateur. Les résultats illustrés correspondent aux vérifications faites le 4 novembre 2026 et ne doivent pas être interprétés comme des valeurs permanentes.

Le dépôt est public et consultable directement à l'adresse https://github.com/Ayoub-regd/R509-TD2-Rendu.
