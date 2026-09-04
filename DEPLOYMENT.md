# Déploiement

Projet Vite + TypeScript prêt à importer dans GitHub/Vercel.

- Build Vercel : `npm run build`
- Sortie : `dist`
- Entrée : `index.html` à la racine
- Les fichiers publics (`vocab.json`, `export_metadata.json`, `audio-processor.js`) sont servis depuis `/`.
- Le modèle ONNX est téléchargé depuis son URL publique Hugging Face puis mis en cache dans IndexedDB. Aucun secret n'est requis.

Vérifier que le navigateur autorise le microphone et que l'application est servie en HTTPS (ou localhost).
