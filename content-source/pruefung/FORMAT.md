# Формат модельных тестов (content-source/pruefung/*.yaml)

Модельный тест — полностью свой текст в формате экзамена (Goethe / ÖSD / ÖIF). Ничего не копировать из официальных
Modellsätze: формат (количество частей, типы заданий, примерное время) — да, тексты и задания — только свои.

```yaml
id: a1-test-1                 # уникальный id, совпадает с именем файла
level: A1
exam: Goethe-Zertifikat A1 (Format)   # на какой экзамен похоже
title: Modelltest A1 · 1
title_ru: Пробный тест A1 · 1
intro_ru: |                   # 2–3 предложения: что в тесте, как проходить
  ...
parts:
  - id: hoeren                # hoeren | lesen | schreiben | sprechen
    skill: Hören
    minutes: 20               # время на часть (ориентир)
    instructions: |           # инструкция по-немецки, как на экзамене
      ...
    instructions_ru: |
      ...
    sections:                 # «Teile» внутри части
      - title: Teil 1
        task: Sie hören fünf kurze Gespräche. Kreuzen Sie an: a, b oder c.   # по-немецки
        task_ru: …
        voice: de-DE
        play: 2               # сколько раз можно прослушать (1 или 2)
        blocks:               # каждый блок = аудио (lines) или текст (text) + вопросы
          - lines:            # только для Hören: реплики; s — говорящий A/B
              - s: A
                t: "…"
            items: [ ... ]    # упражнения в формате content-source/FORMAT.md, раздел 2.7 (choice / tf), у каждого поле ru
          - text: |           # только для Lesen: текст (объявление, письмо, табличка…)
              ...
            items: [ ... ]
  - id: schreiben
    skill: Schreiben
    minutes: 20
    instructions: …
    instructions_ru: …
    writing:                  # задания в формате content-source/FORMAT.md, раздел 2.5 (id, exam, kind, task, task_ru, points, words, structure, redemittel, model, checklist)
      - …
    max_points: 25            # сколько баллов за часть (для самооценки)
  - id: sprechen
    skill: Sprechen
    minutes: 15
    instructions: …
    instructions_ru: …
    speaking:                 # карточки в формате раздела 2.6 (id, exam, task, task_ru, prompts, model)
      - …
    max_points: 25
```

Баллы: Hören и Lesen считаются автоматически (1 вопрос = 1 балл). Schreiben и Sprechen — самооценка по чек-листу
(ученик или учитель выставляет баллы) + кнопка «промпт для ИИ».
Проверка: `python3 build.py --check` (модельные тесты проверяются вместе с юнитами).
