# DESIGN.md: The Willow Mystery

**Card:** P3 Multi-agent collaborative learning · **P3-T9** Where does a plant's mass come from? (Cl. 7–10) · **L6** High-achieving Olympiad learner, bored by routine practice · **C5** Teacher-in-the-loop · **ID 24B0354**

## Problem
Strong students can recite 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂ but still believe a tree's mass comes from the soil or from water. The equation is memorised, but it is never used to account for mass. Routine NCERT questions never catch this, so Olympiad aspirants get bored and keep the misconception. Our app makes the learner put the question on trial. Three AI agents explain, challenge and judge the evidence, and the learner settles their disagreements using data. A teacher (Olympiad coach) sees every AI judgement and can approve or override it.

**Context of use:** home self-study in a 20–30 min evening slot, on a laptop or Android phone (Chrome), in English.

## Learning outcomes
1. **Explain**, using the photosynthesis equation, that most of a plant's *dry* mass comes from carbon dioxide in the air (C and O atoms), not from the soil.
2. **Interpret** van Helmont's willow data (tree gained ≈ 74 kg, soil lost ≈ 0.057 kg) to **reject** the soil hypothesis quantitatively.
3. **Compare** fresh mass and dry mass, and **predict** which source (water, CO₂, soil minerals) dominates each.

## Persona: Ishita Rao
- **Age 15**, Class 10 (CBSE), Pune. Preparing for NSEJS/IJSO.
- **Prior knowledge:** can write the balanced photosynthesis equation. Knows roots absorb water and minerals, and knows conservation of mass. Has not linked the two.
- **Misconception M1 (soil):** "Plants grow by taking in matter from the soil. That's why we add fertiliser."
- **Misconception M2 (water):** "Most of a plant's mass is water from the roots." This is true for *fresh* mass but wrong for *dry* mass.
- **Device:** her own Android phone plus the family laptop. 25-min slots after coaching class, 8–9 PM.
- **Language:** English for study (Marathi at home).
- **Motivation:** wants hard, "trick" questions and arguments. Switches off on drill. Likes being proven wrong *by evidence*, not by authority.
- **Teacher:** Mr. D'Souza, her Olympiad coach, reviews the AI feedback for 6 students on weekends.

## Agents (≥ 3, distinct roles, exchange information)
| Agent | Role | Sees |
|---|---|---|
| **Explainer** ("Dr. Leaf") | Explains with the equation and atom bookkeeping | learner's answer |
| **Challenger** ("Skeptic") | Argues the strongest *rival* claim (water or soil) to test reasoning | learner's answer + Explainer's reply |
| **Judge** ("Evidence Judge") | Checks every claim against the evidence board, then gives the learner feedback | learner + both agents + evidence board |

**Disagreement moment:** the Explainer says "most mass comes from CO₂", and the Challenger says "most mass is water". The app does not pick a winner. It shows a **Disagreement card** with both claims side by side, and the learner runs the **drying tool** (fresh 100 g of leaves → about 12 g dry) to decide which claim holds for *fresh* and which for *dry* mass. The Judge then evaluates the learner's verdict. Learner agency is preserved, and the confusion becomes the task.

**AI checks:** the Judge output is JSON-schema checked. A rule check also rejects any feedback that says "most mass comes from soil". Failed or blocked output → a clearly labelled *recorded sample* fallback. All Judge feedback is queued for teacher review (C5).

## Content plan: one activity, about 15 min
1. **Predict (diagnostic):** "A 2.3 kg willow grows to 76.7 kg in 5 years. Where did most of the 74 kg come from?" Choices: soil / water / air / sunlight. The learner also gives a confidence level and a one-line reason. **Adaptive start:** soil → M1 path, water → M2 path, air + confident → Olympiad path.
2. **Evidence lab (tool):** van Helmont mass ledger. The learner enters the soil before and after (90.7 kg → 90.643 kg), and the app computes the fraction of the tree's gain that soil could explain (≈ 0.08%). The drying tool covers fresh vs dry mass.
3. **Agent round-table:** the learner writes their explanation, and the three agents respond in turn, each seeing the earlier replies.
4. **Disagreement card:** the learner resolves it using the drying tool, and the Judge gives feedback.
5. **Challenge set (5 tasks, 4 formats):**
   - T1 MCQ: source of most *dry* mass → **CO₂ from air**
   - T2 numeric: % of the tree's gain the soil loss could explain → **≈ 0.08%** (0.057 / 74)
   - T3 match: element → source (C → CO₂, H → H₂O, N/Mg → soil, O in sugar → CO₂)
   - T4 numeric prediction: dry mass of 500 g fresh spinach → **≈ 40–60 g** (≈ 90% water)
   - T5 free-text explain (AI judged): convince a friend who says "plants eat soil"
   - Olympiad twist: the O₂ released comes from **H₂O** (Ruben & Kamen, ¹⁸O, 1941), so the O in sugar comes from CO₂
6. **Feedback:** a correct answer gets confirmation plus *why*. M1 answers are confronted with the soil-loss number. M2 answers get the fresh-vs-dry contrast. Two wrong in a row → the Explainer gives an alternative explanation (atom-counting analogy) before the next task.
7. **Teacher view:** lists each learner's answers and AI feedback, with Approve / Override (edit text). The learner sees a "Reviewed by teacher" badge or the teacher's version.

## Screens / states
Welcome → Predict → Evidence lab → Round-table → Disagreement → Challenge set → Summary, plus Teacher view and About. Identity token 24B0354 is in every footer.

## Tech
Static HTML/CSS/JS, plus one Vercel serverless function `/api/agents` that calls OpenRouter (key in a Vercel env var, never in the repo). State lives in `localStorage`, and the teacher view syncs across tabs on the same device through `storage` events. No UI library.
