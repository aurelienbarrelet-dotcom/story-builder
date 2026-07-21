# Sprint 12.26 — Checklist de consolidation

## États et sélection
- [ ] Projet → chapitre → Projet : propriétés, vue, calques et légende cohérents.
- [ ] Chapitre → chapitre en Desktop : caméra Desktop conservée.
- [ ] Chapitre → chapitre en Mobile : mode Mobile conservé.
- [ ] Nouveau projet : Projet sélectionné, aucune donnée résiduelle.
- [ ] Ouverture d’un projet : mode Desktop rétabli et état propre.

## Vues
- [ ] Desktop → Mobile : cadre téléphone et caméra mobile/héritée.
- [ ] Mobile → Desktop : largeur complète et caméra Desktop.
- [ ] « Utiliser cette vue » actif uniquement après modification.
- [ ] Suppression de la vue mobile : retour immédiat à Desktop héritée.

## Mapbox
- [ ] Nouveau projet : token et style vides.
- [ ] Ouverture d’un projet sans token : aucun token précédent réutilisé.
- [ ] Changement de style : calques rechargés sans état résiduel.

## Export
- [ ] Vue initiale Projet Desktop/Mobile.
- [ ] Vues de chapitres Desktop/Mobile.
- [ ] Calques du Projet appliqués comme référence.
- [ ] Légendes, images, auteurs et footer identiques à l’éditeur.
- [ ] Aucun état du chapitre précédent ne persiste.

## Compatibilité
- [ ] Ancien projet sans `projectConfig`.
- [ ] Ancien projet sans `mobileLocation`.
- [ ] Projet vide.
- [ ] Projet avec un grand nombre de chapitres.

## Sprint 13.1 — Historique et presse-papiers

- [ ] Modifier un titre, attendre une courte pause, puis Annuler : le texte précédent revient en une seule étape.
- [ ] Ajouter, supprimer, déplacer et dupliquer un chapitre, puis tester Annuler/Rétablir.
- [ ] Modifier une vue, un calque et une légende, puis tester Annuler/Rétablir.
- [ ] Vérifier que les boutons Annuler/Rétablir sont désactivés lorsqu’aucune action n’est disponible.
- [ ] Copier un chapitre puis le coller après la sélection.
- [ ] Copier une multi-sélection puis la coller ; vérifier les nouveaux identifiants uniques.
- [ ] Tester Ctrl/Cmd+C, Ctrl/Cmd+V et Ctrl/Cmd+D hors d’un champ de texte.
- [ ] Vérifier que les raccourcis Copier/Coller natifs restent disponibles dans les champs de texte.
- [ ] Créer ou ouvrir un projet : l’historique doit repartir vide.


## Sprint 13.3 — lecteur et barre supérieure

- [ ] Le premier chapitre est visible et en opacité complète à l’ouverture du lecteur.
- [ ] En entrant dans le deuxième chapitre, seul celui-ci est en opacité complète.
- [ ] Un chapitre ne repasse pas en opacité réduite tant qu’un autre chapitre n’est pas entré.
- [ ] Aucun bouton Copier, Coller ou Dupliquer n’apparaît dans la barre supérieure.
- [ ] Ctrl/Cmd+C, Ctrl/Cmd+V et Ctrl/Cmd+D fonctionnent toujours hors des champs de saisie.


## Introduction et premier chapitre — Sprint 13.5

- [ ] Au chargement, la slide de titre est visible et aucune légende de chapitre n'est affichée.
- [ ] Le chapitre 1 ne devient actif que lorsqu'il atteint le seuil Scrollama.
- [ ] La légende du chapitre 1 apparaît exactement à ce moment.
- [ ] En remontant vers l'introduction, le chapitre 1 redevient inactif et sa légende ne reste pas affichée.


## Sprint 13.6 — Calques et auteurs
- [ ] Le nom d’un auteur se met à jour immédiatement dans l’en-tête de sa carte.
- [ ] Les sliders et leurs champs numériques restent synchronisés.
- [ ] Une opacité modifiée dans un chapitre ne contamine ni le précédent ni le suivant.
- [ ] Une couleur de texte modifiée est visible dans le mode Lecture et dans l’export.
- [ ] La visibilité et les autres propriétés d’un calque sont restaurées à chaque changement de chapitre.

## Sprint 13.7

- [ ] Saisir 0, 9, 10 et 100 dans un champ d’opacité.
- [ ] Vérifier que 0 place le curseur à l’extrémité gauche et 100 à droite.
- [ ] Descendre au chapitre 1 puis remonter : la caméra d’introduction doit être restaurée.
- [ ] Passer en Lecture depuis un chapitre : le lecteur doit s’ouvrir sur ce chapitre.
- [ ] Revenir en Édition depuis un chapitre lu : ce chapitre doit être sélectionné.
- [ ] Vérifier la synchronisation Desktop/Mobile dans les deux sens.


## Sprint 13.9
- Liste de copie des styles reconstruite depuis l’ordre courant du projet.
- Chapitre source visible et désactivé pour conserver un ordre identique.
- En-tête « Éléments à dupliquer » avec sélection alignée à droite.
- Simulateur mobile d’édition aligné sur le viewport du mode Lecture (390 × 844, bordure et rayon identiques).

## Sprint 13.12
- [ ] Réordonner les chapitres et vérifier que Chapitre 1, 2, 3 se renumérotent immédiatement.
- [ ] Ouvrir Copier les styles depuis plusieurs chapitres et vérifier un ordre identique à la liste principale.
- [ ] Vérifier que chaque cible affiche son numéro et son titre ou extrait de description.
- [ ] Vérifier les pictogrammes bleus image et légende, sans mention textuelle.


## Sprint 13.13
- [ ] La carte sélectionnée utilise un fond rouge léger et un contour rouge.
- [ ] Les pictogrammes ordinateur/téléphone apparaissent en édition et en lecture.
- [ ] Les toggles conservent leurs libellés accessibles.

## Sprint 13.14
- [ ] Sélectionner un chapitre : le numéro reste noir et lisible.
- [ ] Vérifier que le numéro est légèrement plus grand que dans le Sprint 13.13.
- [ ] Retirer l'image d'un chapitre : la prévisualisation affiche un fond gris uni, sans trame.

## Alpha 27.3.4 — Stabilisation des panneaux

- [ ] Le panneau Calques s’ouvre sans déformation ni débordement.
- [ ] La recherche, le filtre de type et la liste des calques conservent leur comportement actuel.
- [ ] La barre de réinitialisation apparaît uniquement lorsqu’au moins un calque est sélectionné.
- [ ] Le compteur de sélection et le pictogramme de réinitialisation restent visibles en bas du volet.
- [ ] Le menu des légendes actives s’ouvre sans ajouter de barre de défilement.
- [ ] Les filtres des légendes disponibles restent fixes pendant le défilement de la liste.


## Alpha 27.4 — Validation finale UI

- [ ] Vérifier le panneau Chapitres : sélection, menu contextuel et barre d’action.
- [ ] Vérifier le panneau Calques : recherche, filtre, sélection et réinitialisation.
- [ ] Vérifier le panneau Légendes : menu flottant, filtres fixes et défilement de la liste.
- [ ] Vérifier le panneau Vue : contrôle Desktop/Mobile compact et fonctionnel.
- [ ] Vérifier les cartes d’images : titres correctement espacés.
