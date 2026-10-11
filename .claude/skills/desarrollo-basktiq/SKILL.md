---
name: desarrollo-basktiq
description: Convenciones para modificar el código de la app BasktIQ Pro (React 19 + TypeScript + Vite + Recharts + Gemini). Úsala siempre que la tarea toque archivos de este repo como App.tsx, components/, context/, services/ o types.ts, por ejemplo para añadir una vista, una métrica, una traducción, un gráfico o una llamada a Gemini, o para arreglar un error de la app. No la uses para análisis de baloncesto sin cambios de código.
---

# Desarrollo de BasktIQ Pro

## Estructura

- `App.tsx`: navegación. Cada vista es un valor del enum `View` (`types.ts`), un `case` en el `switch` de render, otro en el del título y, si va en el menú, una entrada en la lista de navegación.
- `components/`: un componente por vista (`export const Nombre: React.FC`).
- `context/GameContext.tsx`: estado del partido (`homeStats`, `awayStats`, `events`) y métricas derivadas en `derivedMetrics` (Cuatro Factores). **Las métricas nuevas se calculan aquí**, no dentro de los componentes, para que todas las vistas usen la misma fórmula.
- `context/LanguageContext.tsx`: textos en `translations.es` y `translations.en` con claves `seccion.clave`. Usa `const { t } = useLanguage()` y `t('clave')`.
- `services/geminiService.ts`: todas las llamadas a Gemini. Usa `callWithRetry`, comprueba `apiKey` y devuelve un mensaje en el idioma (`'es' | 'en'`) si falta.

## Reglas

1. **Bilingüe siempre**: cada texto visible tiene clave en `es` **y** en `en`. Nada de cadenas sueltas en los componentes.
2. **Fórmulas**: mantén las del `GameContext` (eFG = (FG + 0,5·3P)/FGA; TOV% = TOV/(FGA + 0,44·FTA + TOV); ORB% = ORB/(ORB + DRB rival); FTr = FT/FGA). Si cambias una, cambia también `plugins/scouting-baloncesto/skills/scouting-baloncesto/SKILL.md`.
3. **Gráficos** con Recharts dentro de `ResponsiveContainer`.
4. **Gemini**: la clave llega de `GEMINI_API_KEY` en `.env.local` (Vite la expone como `process.env.API_KEY`). Nunca escribas la clave en el código ni la subas.
5. Tipos nuevos en `types.ts`; evita `any` en código nuevo.

## Comprobar antes de terminar

```bash
npm install          # si no hay node_modules
npx tsc --noEmit     # tipos
npm run build        # compila con Vite
```

Si cambias algo visible, arranca con `npm run dev` (puerto 3000) y revisa la vista en ambos idiomas.
