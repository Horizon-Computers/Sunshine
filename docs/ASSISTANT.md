# Sunshine Assistant — IA de navigation (Mistral 7B)

Sunshine intègre un assistant IA dans un **panneau latéral** : il résume la
page courante, en extrait les points clés, la traduit, l'explique simplement
et répond à toute question (avec ou sans le contexte de la page). L'extension
vit dans [`extensions/sunshine-assistant/`](../extensions/sunshine-assistant/)
et est embarquée dans les paquets.

## Deux backends au choix (réglable dans ⚙)

| | Ollama local (défaut) | API Mistral AI |
|---|---|---|
| Modèle | `mistral:7b` | `open-mistral-7b` |
| Vie privée | ✅ tout reste sur la machine | les requêtes partent chez Mistral |
| Coût | gratuit | facturation Mistral |
| Prérequis | ~4,5 Go de disque, 8 Go de RAM | une clé sur console.mistral.ai |

### Ollama (recommandé)

```bash
# Installer Ollama : https://ollama.com/download
ollama pull mistral:7b
ollama serve        # écoute sur http://localhost:11434
```

Rien d'autre à configurer : l'assistant pointe sur
`http://localhost:11434` par défaut.

### API Mistral AI

Dans le panneau, ⚙ → « API Mistral AI » → coller la clé créée sur
[console.mistral.ai](https://console.mistral.ai), puis « Tester la
connexion ». La clé est stockée localement (`chrome.storage.local`),
jamais dans le dépôt.

## Utilisation

1. Clic sur l'icône **Sunshine Assistant** → le panneau latéral s'ouvre.
2. Boutons rapides : **📝 Résumer**, **🔑 Points clés**, **🌐 Traduire**,
   **💡 Expliquer** (ils lisent l'onglet actif).
3. **Clic droit sur du texte sélectionné** → « Demander à Sunshine
   Assistant » : le panneau s'ouvre et explique le passage (limité à
   4 000 caractères).
4. Ou question libre ; décocher « 📄 Page courante » pour discuter sans le
   contenu de la page. L'historique de la conversation est conservé dans le
   panneau (12 derniers échanges envoyés au modèle) ; 🗨+ démarre une
   nouvelle conversation.

Les réponses s'affichent **en streaming**. Le texte de page envoyé au modèle
est tronqué à ~12 000 caractères (fenêtre de Mistral 7B).

## Vie privée

- Backend Ollama : **aucune donnée ne quitte la machine**.
- Le contenu de la page n'est lu que sur action explicite (bouton ou case
  « 📄 Page courante » cochée), via `activeTab` — pas de script injecté en
  permanence.
- Pages internes (`brave://…`) et protégées : l'assistant continue sans
  contexte et le signale.

## Installation de l'extension (v1)

L'extension est livrée dans
`/opt/sunshine-browser/extensions/sunshine-assistant/`. En attendant le patch
brave-core d'installation automatique : `brave://extensions` → mode
développeur → « Charger l'extension non empaquetée » → ce dossier. Elle est
aussi testable telle quelle dans Brave/Chromium depuis le dépôt.

## Tests

`tests/js/test_assistant.mjs` (exécutés par `make test` et la CI) couvrent le
manifest (MV3, fichiers, version alignée sur `VERSION`), la construction des
messages (contexte, troncature, historique), le parsing des flux Ollama
(NDJSON) et Mistral (SSE), la préparation des requêtes et le streaming avec
un `fetch` simulé.
