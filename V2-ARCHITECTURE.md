# Story Builder 2.0 — Architecture Alpha 3

Le projet complet est désormais l’unité centrale de l’application.

```text
Project
├── metadata
├── settings
├── story
└── assets
```

## Services

- `project-model.js` crée et met à jour l’objet Project.
- `validation-service.js` contrôle le document avant ouverture, sauvegarde et export.
- `storage-service.js` délègue les opérations à un adaptateur actif.
- `export-service.js` constitue le point d’entrée unique de publication.
- `store.js` conserve le Project complet. `getStory()` reste disponible pour les panneaux existants.

## Prochaine étape

Ajouter un second adaptateur de stockage sans modifier l’éditeur :

```text
Storage service
├── local adapter (actuel)
└── remote adapter (prochain)
```

Le registre `assets` est volontairement vide. Il prépare la future gestion centralisée des images, icônes et polices.
