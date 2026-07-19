# Story Builder 2.0 — Socle de migration

## Format de projet

Le nouveau fichier de travail porte l'extension `.story.json`.

```json
{
  "format": "story-builder-project",
  "formatVersion": 1,
  "application": {
    "name": "Story Builder",
    "version": "2.0.0-alpha.1"
  },
  "savedAt": "2026-07-19T00:00:00.000Z",
  "project": {}
}
```

## Compatibilité

L'ouverture accepte :

1. le nouveau format `.story.json` ;
2. un ancien fichier JSON contenant directement `story` ;
3. un ancien fichier JavaScript commençant par `window.storyProject =`.

## Séparation des usages

- **Sauvegarder** produit le fichier de travail versionné.
- **Exporter** produit le ZIP complet destiné à Scrolly.

## Prochaines étapes

- renforcer la validation et les migrations de format ;
- ajouter un adaptateur de stockage cloud ;
- externaliser progressivement les médias ;
- conserver l'export Scrolly comme opération reproductible.
