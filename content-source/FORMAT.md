# Формат исходного контента Deutsch-Reise

Весь контент лежит в `content-source/`. Скрипт `build.py` (в корне репо) читает эти файлы,
проверяет их и генерирует `app-beta/data/*.js`. При любой ошибке сборка падает с понятным сообщением.

```
python3 build.py --check     # только проверка
python3 build.py             # проверка + генерация data/*.js
```

Один город = один юнит = два файла:

- `content-source/vocab/<unit>.txt` — словарь (строчный формат, см. ниже);
- `content-source/units/<unit>.yaml` — всё остальное (YAML).

`<unit>` — это id юнита: `a1-hamburg`, `a1-berlin`, `a1-leipzig`, `a2-koeln`, …

Общие правила:

- Все тексты пишутся с нуля, своими словами. Никаких цитат из учебников и официальных Modellsätze.
- Немецкий — уровень носителя, неоднозначное по Duden. Кавычки в немецком тексте — „так“.
- Русский перевод — естественный, не калька.
- Австрийские варианты: поле `AT:` в словаре; в текстах можно писать «Jänner (DE: Januar)».
- Все `id` уникальны во всём проекте. Префикс = id юнита без уровня: `hh-`, `be-`, `le-` и т. д.

---

## 1. Словарь: `vocab/<unit>.txt`

Одна строка — одно слово. Поля разделены ` | ` (пробел, черта, пробел). Пустые строки и строки
с `#` игнорируются. Строка `## Тема` начинает тематическую группу (например `## Familie`):
группы видны в приложении.

### Существительное: `N`

```
N der Bahnhof | Bahnhöfe | вокзал | Ich warte am Bahnhof. | Я жду на вокзале.
N die Straße | Straßen | улица | Die Straße ist sehr lang. | Улица очень длинная.
N das Obst | Sg. | фрукты | Ich kaufe Obst auf dem Markt. | Я покупаю фрукты на рынке.
N die Eltern | Pl. | родители | Meine Eltern wohnen in Kiew. | Мои родители живут в Киеве.
N die Tomate | Tomaten | помидор | Die Tomaten sind frisch. | Помидоры свежие. | AT: der Paradeiser, Paradeiser
```

Поля: `артикль Слово | множественное | перевод | пример | перевод примера`.
- Артикль обязателен: der / die / das.
- Множественное пишется полной формой без артикля: `Bahnhöfe`. `Sg.` — только единственное,
  `Pl.` — только множественное (тогда артикль `die`). Множественное не должно быть пустым.
- Пример — короткое естественное предложение уровня юнита, содержащее это слово (в любой форме).

### Глагол: `V`

```
V wohnen | wohnt | wohnte | hat gewohnt | жить, проживать | Ich wohne in Hamburg. | Я живу в Гамбурге.
V fahren | fährt | fuhr | ist gefahren | ехать | Wir fahren mit dem Zug. | Мы едем на поезде. | rek: mit + Dat.
V an·kommen | kommt an | kam an | ist angekommen | прибывать | Der Zug kommt um acht an. | Поезд прибывает в восемь.
V sich vor·stellen | stellt sich vor | stellte sich vor | hat sich vorgestellt | представляться | Darf ich mich vorstellen? | Разрешите представиться?
V warten | wartet | wartete | hat gewartet | ждать | Ich warte auf den Bus. | Я жду автобус. | rek: auf + Akk.
```

Поля: `инфинитив | Präsens 3 л. ед. ч. | Präteritum 3 л. | Perfekt 3 л. (hat/ist + Partizip II) | перевод | пример | перевод примера`.
- Отделяемая приставка отмечается точкой посередине: `an·kommen`, `ein·kaufen`.
- Управление — необязательное поле `rek: auf + Akk.` (это «Rektion»).

### Всё остальное: `W`

```
W schnell | Adj. | быстрый; быстро | Der Zug ist sehr schnell. | Поезд очень быстрый.
W heute | Adv. | сегодня | Heute habe ich Zeit. | Сегодня у меня есть время.
W Guten Morgen! | Phrase | Доброе утро! | Guten Morgen, Frau Weber! | Доброе утро, госпожа Вебер!
W der Januar | Nomen | январь | Im Januar ist es kalt. | В январе холодно. | AT: der Jänner
```

Поля: `слово | часть речи | перевод | пример | перевод примера`.
Части речи: `Adj.`, `Adv.`, `Präp.`, `Konj.`, `Pron.`, `Num.`, `Art.`, `Phrase`, `Nomen` (только для
слов без множественного вроде месяцев и дней недели, если удобнее), `Partikel`, `Interj.`.

### Необязательные поля в конце строки (для любого типа)

- `AT: …` — австрийский вариант (`AT: der Paradeiser`, `AT: heuer`).
- `form: …` — форма слова, которая стоит в примере, если проверка не находит её сама
  (например, `V sein | ist | war | ist gewesen | быть | Ich bin müde. | Я устал. | form: bin`).
- `note: …` — короткая заметка по-русски (особенности употребления).

---

## 2. Юнит: `units/<unit>.yaml`

```yaml
id: a1-hamburg
level: A1
city: Hamburg
country: DE            # DE | AT | CH
title: Ankommen & Sich vorstellen
title_ru: Приезд и знакомство
intro: |               # 2–3 предложения по-русски: что будет в юните
  ...

grammar: [...]         # темы грамматики (см. 2.1)
dialogues: [...]       # ролевые диалоги (2.2)
texts: [...]           # тексты для чтения (2.3)
listening: [...]       # аудирование (2.4)
writing: [...]         # письмо (2.5)
speaking: [...]        # карточки для устной части (2.6)
test: [...]            # мини-тест: упражнения (2.7), минимум 10
```

### 2.1 Грамматика

```yaml
grammar:
  - id: hh-g-sein-haben
    title: sein und haben im Präsens
    title_ru: Глаголы sein и haben в настоящем времени
    terms:                         # «Что значат обозначения»: каждый термин/сокращение из темы
      - t: Präsens
        ru: настоящее время
      - t: Infinitiv
        ru: начальная форма глагола (sein, haben)
    meaning: |                     # «Что это значит»: просто и прямо, без метафор, по-русски
      ...
    steps:                         # «Пример» по шагам
      - de: Ich bin Anna.
        ru: Подлежащее ich → форма bin.
      - de: Du bist ...
        ru: ...
    table:                         # таблица форм
      head: [Person, sein, haben]
      rows:
        - [ich, bin, habe]
        - [du, bist, hast]
    exam: |                        # «На экзамене»: что спрашивают (по-русски)
      ...
    traps:                         # типичные ловушки (по-русски, с немецкими примерами)
      - "..."
    exercises: [...]               # минимум 8 упражнений, разные типы (2.7)
```

Каждый термин и сокращение, которое встречается в теме (Akk., Dat., Nom., Partizip II, Subjekt…),
должен быть в `terms`. Объяснения короткие и точные. Не нужно «грамматика — это как…».

### 2.2 Диалоги (ветвящиеся)

```yaml
dialogues:
  - id: hh-d-hotel
    title: An der Rezeption
    title_ru: На ресепшене отеля
    situation_ru: Вы приехали в отель в Гамбурге. Забронирован номер на ваше имя.
    partner: Rezeptionistin          # кто говорит с учеником
    voice: de-DE                     # de-DE | de-AT
    start: n1
    nodes:
      n1:
        say: Guten Abend! Herzlich willkommen im Hotel Elbblick.
        ru: Добрый вечер! Добро пожаловать в отель «Эльбблик».
        options:
          - t: Guten Abend! Ich habe ein Zimmer reserviert.
            ru: Добрый вечер! Я забронировал(а) номер.
            next: n2
          - t: Hallo, ich will Zimmer.
            ru: Привет, я хочу номер.
            next: n2
            ok: false
            fb: Слишком грубо и без артикля. Лучше «Ich habe ein Zimmer reserviert.»
      n2:
        say: ...
        options: [...]
      end:
        say: Gute Nacht!
        ru: Спокойной ночи!
        end: true
```

- `ok: false` — неудачная реплика: показывается `fb` (по-русски), диалог идёт дальше по `next`.
  По умолчанию `ok: true`.
- У каждой не-финальной ноды 2–3 варианта. Все `next` должны существовать. Хотя бы одна нода с `end: true`.
- Длина: 6–10 шагов на пути до конца.

### 2.3 Тексты для чтения

```yaml
texts:
  - id: hh-t-anzeige
    kind: Anzeige                    # Anzeige | E-Mail | Brief | Artikel | Menü | Fahrplan | Schild | Forum
    title: Zimmer frei!
    text: |
      ...
    glossary:                        # слова, которых может не быть в словаре юнита: слово → перевод
      Altbau: старый дом (довоенной постройки)
    questions: [...]                 # упражнения (2.7); у КАЖДОГО обязательно поле ru (перевод вопроса)
```

Объём A1: 60–120 слов; A2: 120–200; B1: 200–350; B2: 300–500.
Вопросы в формате экзамена: `tf` (richtig/falsch), `choice` (a/b/c), для A2+ также сопоставление через `choice`.

### 2.4 Аудирование

```yaml
listening:
  - id: hh-h-durchsage
    kind: Durchsage                  # Durchsage | Dialog | Nachricht (Anrufbeantworter) | Radio
    title: Am Bahnhof
    voice: de-DE
    lines:                           # реплики; s — говорящий (A/B/…, для Durchsage просто A)
      - s: A
        t: "Achtung am Gleis 5: ..."
    questions: [...]                 # упражнения (2.7), у каждого поле ru
    dictation:                       # 3–5 предложений для диктанта (из этого же текста или по теме)
      - Der Zug nach Berlin hat zehn Minuten Verspätung.
```

### 2.5 Письмо

```yaml
writing:
  - id: hh-s-mail
    exam: Goethe A1 · Schreiben Teil 2  # к какому формату относится
    kind: E-Mail                     # E-Mail | Nachricht | Formular | Forumsbeitrag | Beschwerde | Meinung
    task: |                          # задание по-немецки, как на экзамене (своими словами)
      ...
    task_ru: |
      ...
    points:                          # содержательные пункты, которые надо раскрыть
      - Wann kommen Sie an?
    words: [30, 40]                  # диапазон слов
    structure:                       # шаблон структуры по-русски
      - Обращение (Liebe … / Lieber …)
    redemittel:
      - de: Ich komme am … um … an.
        ru: Я приезжаю … в …
    model: |                         # образцовый текст
      ...
    checklist:                       # чек-лист самопроверки (по-русски)
      - Все три пункта задания раскрыты?
```

### 2.6 Карточки для устной части

```yaml
speaking:
  - id: hh-sp-1
    exam: Goethe A1 · Sprechen Teil 1
    task: Sich vorstellen
    task_ru: Расскажите о себе
    prompts: [Name?, Alter?, Land?, Wohnort?, Sprachen?, Beruf?, Hobby?]
    model: |                         # пример ответа
      ...
```

### 2.7 Упражнения (общий формат: грамматика, вопросы к текстам, тест)

```yaml
- type: choice                       # один правильный вариант
  q: Ich ___ aus Polen.
  ru: Я из Польши.                   # перевод / подсказка; ОБЯЗАТЕЛЬНО в вопросах к текстам и аудио
  options: [komme, kommst, kommt]
  answer: komme                      # должен совпадать с одним из options
  why: Ich → окончание -e.           # необязательное объяснение (по-русски), показывается после ответа

- type: tf                           # richtig / falsch
  q: Der Zug kommt um 8 Uhr an.
  ru: Поезд прибывает в 8 часов.
  answer: true

- type: gap                          # ввод с клавиатуры; ___ — пропуск (ровно один)
  q: Wir ___ in Hamburg. (wohnen)
  answer: [wohnen]                   # список допустимых ответов
  why: wir → -en.

- type: order                        # порядок слов (перетаскиванием)
  answer: Am Montag fahre ich nach Berlin.
  tokens: [Am Montag, fahre, ich, nach Berlin]   # необязательно: блоки; иначе — слова через пробел
  also: [Ich fahre am Montag nach Berlin.]       # другие правильные варианты
  ru: В понедельник я еду в Берлин.

- type: table                        # спряжение / склонение: клетки с «?» заполняет ученик
  title: fahren — Präsens
  head: [Person, Form]
  rows:
    - [ich, "?fahre"]          # Zellen mit ? IMMER in Anführungszeichen (sonst liest YAML sie als Objekt)
    - [du, "?fährst"]
    - [er/sie/es, "?fährt"]
```

Проверка `gap`: лишние пробелы игнорируются; если ошибка только в заглавной/строчной букве,
ответ засчитывается как «почти» с подсказкой (важно для существительных). В `gap` можно указать несколько вариантов ответа.
У `choice` 3–4 варианта, неправильные — правдоподобные (типичные ошибки).
