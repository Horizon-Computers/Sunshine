# Politique de sécurité

## Versions supportées

Seule la dernière release de Sunshine est supportée. Sunshine héritant du
moteur de Brave/Chromium, les correctifs de sécurité du moteur arrivent via
les montées de version de l'amont (fichier `VERSION`) — c'est pourquoi il est
important de toujours utiliser la dernière version.

## Signaler une vulnérabilité

- **Vulnérabilité dans le moteur (Chromium/Brave)** : signalez-la directement
  à l'amont ([Brave](https://hackerone.com/brave) /
  [Chromium](https://www.chromium.org/Home/chromium-security/reporting-security-bugs/)).
  Sunshine la recevra via la prochaine montée de version.
- **Vulnérabilité propre à Sunshine** (scripts, patches, branding, chaîne de
  build) : ouvrez un
  [avis de sécurité privé GitHub](https://github.com/Horizon-Computers/Sunshine/security/advisories/new).
  N'ouvrez pas d'issue publique pour une faille non corrigée.

Merci de décrire l'impact, les étapes de reproduction et, si possible, un
correctif proposé. Nous accusons réception sous 7 jours.
