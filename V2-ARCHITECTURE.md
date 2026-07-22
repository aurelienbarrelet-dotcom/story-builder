# Story Builder 2.0 — Architecture Alpha 4

Le projet complet reste l’unité centrale de l’application.

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
- `storage-service.js` gère désormais un registre d’adaptateurs nommés.
- `storage-adapters/local-storage-adapter.js` contient l’implémentation navigateur.
- `export-service.js` constitue le point d’entrée unique de publication.
- `store.js` conserve le Project complet. `getStory()` reste disponible pour les panneaux existants.

## Registre de stockage

```text
Storage service
├── register(adapter)
├── use(adapterId)
├── listProviders()
└── active adapter
    └── local
```

Cette séparation permet d’ajouter ensuite un adaptateur Supabase sans modifier les composants de l’éditeur.

## Prochaine étape

Créer l’adaptateur distant et l’interface de connexion au stockage partagé.


## Moteur de trajectoires (alpha.34.1)

Les trajectoires sont stockées dans `story.motions` car une même animation peut traverser plusieurs chapitres. Elles référencent les objets Mapbox par `layerId`/`featureId` au lieu de dupliquer le modèle ou la géométrie.

Le dossier `js/features/motion/` sépare la normalisation de configuration, le catalogue des couches Mapbox, la préparation des `LineString`, la progression inter-chapitres et l’évaluation d’une pose. Aucune pose n’est appliquée à la carte dans 34.1 : cette version fournit les fondations testables pour les interfaces et adaptateurs d’acteurs suivants.
