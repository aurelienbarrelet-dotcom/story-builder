# Story Builder

## Dernières modifications

### SB-2.0.0-alpha.9 — 2026-07-21

- Le panneau **Images** sépare désormais la galerie et l’inspecteur de propriétés.
- La galerie possède son propre défilement, afin que l’inspecteur reste toujours visible.
- Les propriétés de l’image sélectionnée s’affichent dans une colonne fixe à droite.
- Un état vide explique comment sélectionner une image lorsque l’inspecteur n’a aucun contenu.
- Le titre de l’onglet du navigateur affiche désormais `Story Builder — 2.0.0-alpha.9`.

---

### SB-2.0.0-alpha.8 — 2026-07-21

- Refonte du panneau **Images** sous forme de grille minimale à deux colonnes.
- Un clic sélectionne une image sans modifier le chapitre.
- Un double-clic affecte l’image au chapitre sélectionné ou la retire.
- La sélection utilise uniquement un contour fin ; l’image utilisée est signalée par un petit point discret.
- Le nom, la légende et les actions sont regroupés dans un éditeur sous la grille.
- Le titre de l’onglet du navigateur affiche désormais `Story Builder — 2.0.0-alpha.8`.

---

## Simplification de la barre de projet

La barre supérieure occupe toute la largeur et contient uniquement :

- Nouveau projet
- Ouvrir un projet
- Enregistrer le projet
- Exporter le scrollytelling complet

L’export isolé de `config.js` et le bouton de paramètres Mapbox ont été retirés de la barre.

## Paramètres Mapbox

Le token public et l’URL du style se trouvent désormais dans **Informations générales → Propriétés**, sous le module **Footer**. Le bouton « Enregistrer et connecter » valide les valeurs et reconnecte la carte.

## Sprint 12.18

- Barre d’actions compacte placée sous le bandeau titre.
- Conservation du sélecteur Édition / Lecture dans le bandeau supérieur.
- Suppression des sous-libellés descriptifs dans les modules du panneau Propriétés.


## Sprint 12.18

- Le titre « Story Builder » est aligné à gauche.
- Le sélecteur Édition / Lecture est intégré à la barre d’actions compacte.
- La barre d’actions adopte un thème sombre en mode Lecture.
- Le token public Mapbox et l’URL du style sont enregistrés dans le fichier projet.
- Les anciens projets utilisant le token stocké localement restent compatibles.


## Sprint 12.18

- Centrage vertical du titre Story Builder dans le bandeau supérieur.
- Padding vertical accru dans la barre de navigation.
- Hauteur harmonisée des boutons et du sélecteur Édition / Lecture.


## Sprint 12.18
- Toggle Édition/Lecture actif en bleu.
- Suppression des micro-indications secondaires dans les panneaux.
- Ajout du nom de projet dans Informations générales.
- Le nom du projet détermine le nom du fichier projet JavaScript et de l’archive ZIP exportée.


## Sprint 12.18

- La carte des informations générales est séparée de la liste des chapitres.
- Elle affiche le nom du projet, ou « Projet sans titre » lorsque le champ est vide.
- Un titre « Informations générales » est affiché au-dessus de cette carte.


## Sprint 12.18

- La section « Informations générales » est renommée « Projet ».
- Les espacements de la colonne Chapitres sont harmonisés.
- Le nom du projet se met à jour pendant la saisie.
- Le bouton affiche « Ajouter un chapitre » sans signe +.
- La pastille de la carte Projet devient rouge après une modification non enregistrée et se réinitialise après Enregistrer, Ouvrir ou Nouveau.


## Sprint 12.18

- La carte Projet possède une vue initiale Mapbox.
- Les calques et légendes du Projet servent de valeurs de référence.
- Les nouveaux chapitres héritent de ces valeurs.
- Réinitialiser un calque de chapitre revient à la valeur du Projet.
- Le bouton de réinitialisation est masqué lorsque Projet est sélectionné.


## Sprint 12.18

- Les nouveaux chapitres héritent toujours de la vue, des calques et de la légende du Projet.
- Dans Projet, les commandes de réinitialisation restaurent les valeurs du style Mapbox.
- Dans un chapitre, elles restaurent les valeurs définies dans Projet.


## Sprint 12.19

- cadrages Desktop et Mobile dans le panneau Vue ;
- la vue mobile hérite de la vue desktop tant qu’elle n’est pas personnalisée ;
- suppression d’une adaptation mobile avec « Reprendre la vue desktop » ;
- nouveaux chapitres héritant des deux cadrages du Projet ;
- copie de chapitre transférant les vues Desktop et Mobile ;
- export responsive utilisant les cadrages mobiles lorsque disponibles.


## Sprint 12.20 — aperçu mobile dans le mode édition

- Le sélecteur Mobile du panneau Vue redimensionne la carte en format smartphone.
- Le cadrage est édité directement dans une fenêtre de 390 px de large.
- Le passage à Desktop restaure automatiquement la carte en pleine largeur.
- Mapbox recalcule son canvas après chaque changement de format.


## Sprint 12.21

- retour fiable du cadrage d’édition Mobile vers Desktop ;
- conservation du mode de vue actif lors du changement de chapitre ;
- aperçu de la slide non redimensionné par le simulateur mobile ;
- bloc image entièrement masqué dans l’aperçu lorsqu’aucune image n’est définie.

## Sprint 12.24

- Retour Desktop : recharge explicitement la caméra Desktop après le redimensionnement Mapbox.
- Le bouton « Utiliser cette vue » reste désactivé tant que la caméra n’a pas changé.


## Sprint 12.26

Consolidation des états Desktop/Mobile, synchronisation sûre du token Mapbox, sélection correcte des projets vides et checklist QA dans `QA-CHECKLIST.md`.

## Sprint 13.3 — Historique et presse-papiers

- Annuler / Rétablir : boutons de barre d’outils et raccourcis `Ctrl/Cmd+Z`, `Ctrl/Cmd+Maj+Z`.
- Historique limité à 50 étapes ; les frappes successives dans un même champ sont regroupées.
- Copier / Coller / Dupliquer les chapitres : boutons, menu de chapitre et raccourcis `Ctrl/Cmd+C`, `Ctrl/Cmd+V`, `Ctrl/Cmd+D`.
- La multi-sélection est prise en charge et les identifiants sont régénérés.
- Le presse-papiers complet des chapitres reste séparé de l’outil de copie partielle des styles.


## Sprint 13.3

- Historique disponible uniquement au clavier.
- Mise à jour immédiate des légendes dans l’aperçu d’édition.
- Légendes restaurées dans le lecteur et l’export.
- Opacité des chapitres actifs corrigée en mode lecture.


## Sprint 13.3

- Le premier chapitre est actif dès l’ouverture du lecteur.
- Un seul chapitre reste actif à la fois lors du défilement.
- L’état actif n’est plus supprimé prématurément par `onStepExit`.
- Les boutons Copier, Coller et Dupliquer sont retirés de la barre supérieure.
- Les raccourcis clavier restent disponibles.


## Sprint 13.4
- Correction de la transition entre la slide d’introduction et le premier chapitre.
- Le conteneur des chapitres possède désormais son propre niveau d’empilement au-dessus de la carte.
- Le premier chapitre reste explicitement actif avant et pendant l’initialisation de Scrollama.
- Recalcul des seuils après le chargement des polices.


## Sprint 13.6

- Retour au cycle d'activation du template Mapbox : aucun chapitre actif pendant l'introduction.
- La légende reste masquée tant que le premier chapitre n'est pas entré dans la zone Scrollama.
- Les classes `active` sont entièrement pilotées par `onStepEnter` et `onStepExit`.


## Sprint 13.6
- mise à jour immédiate du nom dans les cartes auteurs ;
- sliders avec saisie numérique en pourcentage ;
- espacements du panneau Calques consolidés ;
- états de calques complets et indépendants à chaque chapitre ;
- couleurs, visibilité et autres propriétés Mapbox appliquées dans le lecteur et l’export.

## Sprint 13.7

- Correction des champs d’opacité : saisie de 0 à 100 sans rerendu pendant la frappe.
- Suppression de la petite valeur redondante au-dessus des contrôles d’opacité.
- Restauration de la caméra et des calques du Projet au retour vers l’introduction.
- Synchronisation de la position et du périphérique entre les modes Édition et Lecture.


## Sprint 13.8

- La liste du dialogue « Copier les styles » est reconstruite à chaque ouverture selon l’ordre actuel des chapitres.
- Les cibles sont identifiées par leur identifiant de chapitre plutôt que par leur ancien index.
- Le dialogue a été simplifié en retirant les mentions « Choisissez les éléments à transférer » et « Éléments à transférer ».


## Sprint 13.9
- Liste de copie des styles reconstruite depuis l’ordre courant du projet.
- Chapitre source visible et désactivé pour conserver un ordre identique.
- En-tête « Éléments à dupliquer » avec sélection alignée à droite.
- Simulateur mobile d’édition aligné sur le viewport du mode Lecture (390 × 844, bordure et rayon identiques).

## Sprint 13.12
- Numérotation visuelle dynamique des chapitres selon leur ordre courant.
- Cartes de chapitres structurées avec numéro, titre ou extrait de description.
- Popup de copie des styles aligné sur la même numérotation.
- Indicateurs bleus sans texte pour les images et les légendes actives.


## Sprint 13.13
- Sélection des chapitres harmonisée avec les panneaux de droite : fond rouge léger et contour accentué.
- Toggles Desktop/Mobile remplacés par des pictogrammes accessibles en édition et en lecture.

## Sprint 13.14
- Le numéro du chapitre sélectionné reste noir et gagne légèrement en taille.
- Les chapitres sans image utilisent un aplat gris uni dans la prévisualisation, sans trame ni texte.

## Story Builder 2.0 — Alpha 3

Architecture projet simplifiée et stricte :

- le bouton **Sauvegarder** télécharge un fichier `nom-du-projet.story.json` ;
- seul le format `story-builder-project`, version 1, est accepté ;
- les anciens fichiers `.js`, les JSON directs et les autres versions ne sont plus importables ;
- la sauvegarde navigateur utilise la même enveloppe versionnée que le fichier téléchargé ;
- la sérialisation, la validation et l’ouverture passent par `storage-service` ;
- l’export ZIP Scrolly reste indépendant et conserve son fonctionnement actuel.

Le format de travail et le package de publication sont désormais deux concepts distincts :

```text
projet.story.json  → fichier de travail
projet-scrolly.zip → package de publication
```


## Architecture v2

Le store contient maintenant un objet `Project` de premier niveau. Voir `V2-ARCHITECTURE.md`.


## Story Builder 2.0 — Alpha 4

- version visible dans l’onglet du navigateur ;
- version interne mise à jour vers `2.0.0-alpha.4` ;
- adaptateur local déplacé dans `js/core/storage-adapters/` ;
- registre d’adaptateurs avec `register`, `use` et `listProviders` ;
- préparation de l’intégration future de Supabase sans changement de comportement pour l’utilisateur.

## Alpha 5 — Asset Manager

Le panneau Ressources permet d'importer, renommer, réutiliser et supprimer des images enregistrées dans le projet.


### Alpha 5.2

La gestion des images de chapitre est centralisée dans le panneau Enrichissements. Une ressource utilisée par le chapitre sélectionné est mise en évidence et peut être retirée directement depuis sa carte.

### Alpha 5.3

- Les cartes image sont désormais sélectionnées indépendamment de leur utilisation dans un chapitre.
- Le titre et la légende restent statiques hors sélection, puis deviennent éditables sur la carte sélectionnée.
- Les actions « Ajouter l’image » et « Supprimer » apparaissent uniquement sur la carte sélectionnée.
- La coche indique exclusivement qu’une image est utilisée par le chapitre courant et permet de la retirer.
