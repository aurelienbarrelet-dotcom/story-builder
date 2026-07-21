## SB-2.0.0-alpha.29.1

### Fondation de la timeline de transition

- Ajout d’un module central qui normalise les pistes **caméra** et **calques**.
- Calcul commun des débuts, durées, délais et fins de piste.
- Le déplacement de l’éditeur, l’aperçu manuel et les transitions de calques utilisent désormais cette même timeline.
- Aucun nouveau champ JSON et aucun changement visible du comportement de lecture.
- Fondation prête pour l’easing puis le pilotage progressif par le scroll.

## SB-2.0.0-alpha.28.4

### Finalisation du panneau Transitions

- Ajout du réglage existant **Mouvement essentiel** dans la section Caméra.
- Libellés explicites pour `flyTo`, `easeTo` et `jumpTo`, avec une aide contextuelle.
- Désactivation de la durée caméra lorsque `jumpTo` est sélectionné.
- Verrouillage du bouton pendant l’aperçu pour éviter les lectures concurrentes.
- Durée d’aperçu calculée à partir de la caméra, du délai et du fondu des calques.
- Aucun changement du format JSON ni du package de publication.

## SB-2.0.0-alpha.28.3

### Aperçu manuel des transitions

- Ajout d’un bouton **Aperçu de la transition** dans l’onglet Transitions.
- L’aperçu replace temporairement la carte sur l’état du chapitre précédent, puis rejoue la caméra et les calques du chapitre sélectionné.
- Pour le premier chapitre, l’état général du projet sert de point de départ.
- L’aperçu ne modifie ni le JSON du projet ni l’historique d’annulation.
- Aucun changement du package de publication.

## SB-2.0.0-alpha.28.2

### Contrôle explicite des transitions de calques

- Ajout d’un interrupteur pour activer ou désactiver les transitions de calques par chapitre.
- Désactivation des champs Fondu et Délai lorsque les transitions sont coupées.
- Ajout rétrocompatible de `layerTransition.enabled` dans le projet JSON ; une valeur absente reste interprétée comme activée.
- Export d’une durée et d’un délai nuls lorsque les transitions sont désactivées.
- Conservation des changements instantanés pour les propriétés non interpolables comme `visibility`.

## SB-2.0.0-alpha.28.1

### Panneau Transitions autonome

- Déplacement des réglages de transition hors du panneau Propriétés.
- Ajout d’un onglet Transitions dans le rail droit, au même niveau que Vue, Calques et Légendes.
- Conservation des champs existants : animation et durée de caméra, comportement des calques, fondu et délai.
- Aucun changement du modèle de données `.story.json` ni de la transformation utilisée par l’export de publication.
- Compatibilité conservée avec les projets existants.

## SB-2.0.0-alpha.27.4

- Consolide les ajustements UI validés de la série 27.3.x.
- Fige les panneaux Calques et Légendes avant le prochain chantier fonctionnel.
- Synchronise la version interne, le titre du navigateur et la documentation, sans changement de comportement.

## SB-2.0.0-alpha.27.3.4

- Fige l’état UI validé des panneaux Calques et Légendes après les correctifs 27.3.x.
- Synchronise la version interne, le titre du navigateur et la documentation.
- Ajoute une courte checklist de non-régression, sans modifier la structure ni le comportement des panneaux.

## SB-2.0.0-alpha.27.3.3

- Met en forme l’action de réinitialisation des calques comme la barre de sélection des chapitres.
- Affiche le nombre de calques sélectionnés et un pictogramme de réinitialisation en bas du volet.
- Ne modifie ni la structure, ni le défilement, ni les filtres du panneau Calques.

## SB-2.0.0-alpha.27.3.2

- Déplace uniquement l’action de réinitialisation des calques en bas du panneau Calques.
- Aucun changement apporté à la structure, aux filtres, au défilement ou au rendu des calques.

## SB-2.0.0-alpha.27.3.1

- Restaure intégralement la structure et le comportement du panneau Calques de l’alpha.27.2.
- Conserve uniquement les ajustements sûrs du panneau Légendes disponibles.

# Story Builder

## Dernières modifications

### SB-2.0.0-alpha.27.3.1 — 2026-07-21

- Corrige le menu des légendes actives afin qu’il s’ouvre hors du conteneur défilant, sans ajouter de barre de défilement ni être rogné.
- Harmonise la recherche et le filtre de type du panneau Légendes avec les contrôles du panneau Calques.

### SB-2.0.0-alpha.27.1 — 2026-07-21

- Remplacement du sélecteur Desktop/Mobile du panneau Vue par un contrôle segmenté plus compact.
- Harmonisation du menu d’actions des légendes actives avec celui des chapitres.
- Extension de la liste des légendes disponibles jusqu’en bas du panneau.
- Ajout d’un filtre par type de calque, en complément de la recherche.

### SB-2.0.0-alpha.27 — 2026-07-21

- Correction des contours de sélection afin qu’ils restent entièrement visibles dans les listes et galeries.
- Mise à la largeur de la colonne des sections « Légendes actives » et « Légendes disponibles ».
- Ajout d’un espacement autour des titres des cartes d’aperçu des images.
- Déplacement du sélecteur Desktop/Mobile de l’espace de travail vers le panneau Vue en mode édition.

### SB-2.0.0-alpha.26 — 2026-07-21

- Premier patch de refactoring JavaScript sans changement fonctionnel.
- Centralisation dans `js/app.js` des identifiants DOM utilisés par l’orchestration principale.
- Remplacement des sélecteurs `getElementById` dispersés par un accès unique et nommé.
- Synchronisation de la constante interne `APP_VERSION` et du titre du navigateur avec `2.0.0-alpha.26`.

### SB-2.0.0-alpha.25 — 2026-07-21

- Consolidation du Design System CSS sans modification fonctionnelle ni structurelle.
- Centralisation des couleurs, espacements, bordures, rayons et durées de transition récurrents.
- Suppression des alias de couleur historiques au profit des variables d’accent canoniques.
- Conservation des valeurs calculées existantes afin de préserver le rendu visuel.
- Le titre de l’onglet du navigateur affiche désormais `Story Builder — 2.0.0-alpha.25`.

### SB-2.0.0-alpha.24.2 — 2026-07-21

- Correctif de restauration après les régressions d’alpha.24 et alpha.24.1.
- Rétablissement du layout complet de l’éditeur et du panneau de propriétés.
- Rétablissement de la carte Projet visible au démarrage.
- Rétablissement de l’ajout et de l’édition des chapitres.
- Rétablissement du mode Lecture.
- Retrait temporaire de l’édition inline instable.

### SB-2.0.0-alpha.23 — 2026-07-21

- Le panneau Légendes adopte les cartes et interactions communes des collections.
- Les légendes disponibles se sélectionnent par clic, sans case à cocher, puis s’ajoutent avec le bouton `+`.
- Les légendes actives prennent en charge la sélection multiple, la suppression groupée et un menu `…` pour renommer, dupliquer ou supprimer.
- Les anciennes croix de suppression et le bouton texte « Ajouter à la légende » sont supprimés.
- Le titre de l’onglet du navigateur affiche désormais `Story Builder — 2.0.0-alpha.23`.

---

### SB-2.0.0-alpha.22.1 — 2026-07-21

- Correction de la hauteur des cartes dans la collection Chapitres.
- Les cartes conservent désormais leur hauteur naturelle, quel que soit leur nombre.
- La liste s’aligne en haut et défile lorsque son contenu dépasse la hauteur disponible.
- Le titre de l’onglet du navigateur affiche désormais `Story Builder — 2.0.0-alpha.22.1`.

### SB-2.0.0-alpha.22 — 2026-07-21

- Un module `CollectionPanel` centralise désormais la sélection simple, multiple et par plage pour les collections.
- Images et Chapitres utilisent la même barre d’actions contextuelle et le même bouton de suppression groupée.
- Les menus `…` des cartes suivent un comportement commun : ouverture exclusive, fermeture extérieure et attributs ARIA synchronisés.
- Les panneaux Images et Chapitres exposent une structure HTML commune prête à accueillir les Légendes dans alpha.23.
- Le titre de l’onglet du navigateur affiche désormais `Story Builder — 2.0.0-alpha.22`.

---

### SB-2.0.0-alpha.21 — 2026-07-21

- Un socle visuel commun harmonise les champs de texte, recherches, listes, zones de texte et contrôles numériques.
- Les boutons principaux et secondaires partagent désormais les mêmes dimensions, rayons, transitions et états désactivés.
- La sélection des cartes Images et Chapitres utilise exclusivement un contour rouge uniforme, sans barre latérale ni coche.
- Les cartes, en-têtes et barres d’actions des collections suivent un contrat visuel commun préparant la refonte des Légendes.
- Le titre de l’onglet du navigateur affiche désormais `Story Builder — 2.0.0-alpha.21`.

---

### SB-2.0.0-alpha.20 — 2026-07-21

- Les transitions, contrastes, zones de focus et détails de survol sont finalisés pour une interface plus stable.
- Les animations respectent la préférence système de réduction des mouvements.
- Les barres de défilement, séparateurs et états vides reçoivent une finition cohérente avec la nouvelle interface.
- Le titre de l’onglet du navigateur affiche désormais `Story Builder — 2.0.0-alpha.20`.

---

### SB-2.0.0-alpha.19 — 2026-07-21

- La hiérarchie des boutons est appliquée plus largement aux fenêtres de dialogue et aux groupes d’actions.
- Une seule action principale est visuellement dominante par zone, les actions secondaires restent neutres et les suppressions deviennent rouges uniquement au moment approprié.
- Les pieds de modale, boutons textuels et boutons iconographiques utilisent des espacements et alignements communs.
- Le titre de l’onglet du navigateur affiche désormais `Story Builder — 2.0.0-alpha.19`.

---

### SB-2.0.0-alpha.18 — 2026-07-21

- Images et Chapitres partagent désormais des règles génériques de collection pour les en-têtes, listes, cartes et barres de sélection.
- Les styles spécifiques deviennent de simples adaptations du contenu de chaque carte.
- Cette base prépare l’extension future aux auteurs, légendes et autres listes sans changer le comportement JavaScript.
- Le titre de l’onglet du navigateur affiche désormais `Story Builder — 2.0.0-alpha.18`.

---

### SB-2.0.0-alpha.17 — 2026-07-21

- Les inspecteurs et formulaires utilisent une densité plus adaptée à un outil d’édition de bureau.
- Les libellés, champs, groupes et séparateurs sont harmonisés pour réduire le défilement.
- Les zones de texte conservent une hauteur confortable tandis que les contrôles simples deviennent plus compacts.
- Le titre de l’onglet du navigateur affiche désormais `Story Builder — 2.0.0-alpha.17`.

---

### SB-2.0.0-alpha.16 — 2026-07-21

- Les panneaux gagnent une structure plus plate, des en-têtes plus nets et des séparateurs plus discrets.
- Les cartes Images et Chapitres abandonnent les ombres au profit d’un fond de survol stable et d’un repère d’accent latéral.
- Les espacements verticaux sont resserrés pour afficher davantage de contenu sans modifier les interactions.
- Le titre de l’onglet du navigateur affiche désormais `Story Builder — 2.0.0-alpha.16`.

---

### SB-2.0.0-alpha.15 — 2026-07-21

- Un socle commun de boutons (`ui-button` et `ui-icon-button`) formalise les actions principales, secondaires, iconographiques et destructives.
- Les états de survol, activation, focus clavier et désactivation sont désormais homogènes.
- Les panneaux Images et Chapitres ainsi que la fenêtre de copie des styles utilisent ces nouveaux composants.
- Les variables CSS de taille, transition, focus et danger doux sont centralisées pour les prochains panneaux.
- Aucun comportement fonctionnel de sélection ou de suppression n’a été modifié.
- Le titre de l’onglet du navigateur affiche désormais `Story Builder — 2.0.0-alpha.15`.

---

### SB-2.0.0-alpha.14 — 2026-07-21

- Les actions de suppression groupée utilisent désormais une icône poubelle compacte avec infobulle et libellé accessible.
- Les boutons « + » des panneaux Images et Chapitres deviennent les actions principales, avec une hiérarchie visuelle plus nette.
- Les actions destructives restent neutres au repos et deviennent rouges uniquement au survol.
- Le titre de l’onglet du navigateur affiche désormais `Story Builder — 2.0.0-alpha.14`.

### SB-2.0.0-alpha.13 — 2026-07-21

- La coche superposée aux images sélectionnées a été supprimée : le contour rouge devient l’unique indicateur de sélection.
- Le bouton d’import du panneau **Images** est désormais réduit à un simple bouton « + ».
- Le panneau **Chapitres** adopte le même langage d’interface : bouton « + » dans l’en-tête, survol discret, sélection multiple et barre de suppression contextuelle.
- Les chapitres sélectionnés utilisent désormais un contour rouge sans fond coloré, afin de rester cohérents avec les cartes Images.
- Le titre de l’onglet du navigateur affiche désormais `Story Builder — 2.0.0-alpha.13`.

---

### SB-2.0.0-alpha.12 — 2026-07-21

- Le bouton d’import est désormais compact et placé directement dans l’en-tête du panneau **Images**.
- Le clic simple sélectionne une image ; `Ctrl`/`Cmd + clic` permet une sélection multiple et `Shift + clic` sélectionne une plage.
- Une barre d’actions contextuelle affiche le nombre d’images sélectionnées et permet leur suppression groupée.
- La suppression a été retirée de l’inspecteur afin de séparer clairement l’édition d’une image des actions globales.
- Le titre de l’onglet du navigateur affiche désormais `Story Builder — 2.0.0-alpha.12`.

---

### SB-2.0.0-alpha.11 — 2026-07-21

- Le panneau **Images** occupe désormais une largeur fixe équivalente à deux colonnes standards.
- Cette largeur est divisée en deux parties égales : les images à gauche et les propriétés à droite.
- Les images ne sont plus affichées en mosaïque : elles apparaissent sous forme de cartes empilées verticalement.
- Le titre de chaque image est affiché discrètement sous sa miniature.
- Le titre de l’onglet du navigateur affiche désormais `Story Builder — 2.0.0-alpha.11`.

---

### SB-2.0.0-alpha.10 — 2026-07-21

- L’ouverture du panneau **Images** élargit désormais réellement l’espace de travail de droite.
- La galerie et l’inspecteur sont répartis dans deux colonnes internes avec un ratio d’environ 2/3–1/3.
- La galerie profite de la largeur disponible et adapte automatiquement le nombre de miniatures par ligne.
- Les autres panneaux conservent leur largeur habituelle ; l’élargissement est réservé au gestionnaire d’images.
- Le titre de l’onglet du navigateur affiche désormais `Story Builder — 2.0.0-alpha.10`.

---

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
---

## Roadmap actuelle

- ✔ alpha.21 : unification UI
- ✔ alpha.22 : extraction CollectionPanel
- ✔ alpha.22.1 : correction des cartes de chapitres
- ✔ alpha.23 : refonte du panneau des légendes
- ✔ alpha.24.2 : retour à une base stable (abandon de l’édition inline)

### À venir

- ✔ alpha.25 : Design System
- ✔ alpha.26 : refactoring JavaScript
- ✔ alpha.27 : ajustements UI des collections, légendes, images et panneau Vue
- alpha.27 : bibliothèque d’assets
- alpha.28 : système de widgets
- alpha.29 : architecture des exports
