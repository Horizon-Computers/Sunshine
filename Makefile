# Raccourcis pour le développement de Sunshine. Voir docs/BUILD.md.

BRAVE_CORE := build/brave-browser/src/brave

.PHONY: help icons init brand build dist test check clean

help: ## Affiche cette aide
	@grep -E '^[a-z-]+:.*##' $(MAKEFILE_LIST) | awk -F ':.*## ' '{printf "  %-10s %s\n", $$1, $$2}'

icons: ## Génère les PNG/ICO/ICNS depuis le SVG
	./scripts/generate_icons.sh

init: ## Télécharge brave-browser + brave-core + Chromium (long, ~70 Go)
	./scripts/init.sh

brand: ## Applique le branding Sunshine sur brave-core
	python3 scripts/apply_branding.py $(BRAVE_CORE)

build: ## Compile le navigateur en Release
	cd build/brave-browser && npm run build Release

dist: ## Crée les paquets d'installation
	cd build/brave-browser && npm run create_dist Release

test: ## Lance les tests unitaires
	python3 -m unittest discover -s tests -v

check: ## Vérifie la syntaxe des scripts et le fichier VERSION
	bash -n scripts/*.sh
	python3 -m py_compile scripts/apply_branding.py
	grep -qE '^SUNSHINE_VERSION=[0-9]+\.[0-9]+\.[0-9]+$$' VERSION
	grep -qE '^BRAVE_VERSION=[0-9]+\.[0-9]+\.[0-9]+$$' VERSION
	python3 -m unittest discover -s tests

clean: ## Supprime les icônes générées (pas le checkout build/)
	rm -rf assets/logo/png
