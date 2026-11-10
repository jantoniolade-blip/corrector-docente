# Corrector docente · v0.2

Aplicación independiente: https://jantoniolade-blip.github.io/corrector-docente/

Revisión de propuestas de corrección por criterios, diagnóstico del grupo y exportación Excel y PDF. Los archivos y las identidades permanecen en el dispositivo (IndexedDB). La IA se utiliza importando sus respuestas; no hay una API de IA integrada.

## Desarrollo

```bash
npm ci
npm test
npm run dev
npm run build
```

## Publicación

GitHub Actions ejecuta las pruebas, compila y publica `dist/` en GitHub Pages en cada cambio en `main`.

## Documentación

- [Guía de uso](docs/GUIA_USO.md)
- [Decisiones técnicas](docs/DECISIONES.md)

Código extraído de `docente/app` de la rama `corrector-docente` de `jcamjim584-star/pichu-lab`, commit `2fc0645e92431fff7dc302b5ccd2e505b2a1a065`. Este repositorio solo contiene el corrector, su documentación y pruebas sin identidad; no contiene los juegos, exámenes escaneados ni tablas de identidades.
