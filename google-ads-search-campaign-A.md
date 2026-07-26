# Google Ads — Кампания «Вариант A · Старт» (Search, €450/мес)

> **Готовый build-лист для ручного переноса в Google Ads.**
> Ничего в аккаунте автоматически не создано — это только тексты и настройки.
> Данные объёмов/CPC — реальные, из Keyword Planner этого аккаунта (Испания, español).
> Конверсия «Lead» уже стоит на сайте (Google Ads `AW-18251052543` + Meta CAPI).

---

## 1. Настройки кампании

| Параметр | Значение |
|---|---|
| Название | `HS · Search · ES · Muebles` |
| Тип | Поисковая (Search) |
| Цель | Ventas / Clientes potenciales → конверсия **Lead** (существующая) |
| Сети | **Только поиск.** Снять галочки «Red de Búsqueda de partners» и «Red de Display» |
| Локация | **España**. Таргетинг = «Presencia: personas en tus ubicaciones» (НЕ «интерес к локации») |
| Язык | Español |
| Дневной бюджет | **€15/день** (≈ €450/мес) |
| Стратегия ставок | **Старт:** «Maximizar clics», лимит CPC **€0,55** → после ~15–20 конверсий → «Maximizar conversiones» → позже CPA objetivo **~€25** |
| Ротация объявлений | Optimizar |
| Устройства | Все (моб. трафик по мебели преобладает) |
| Расписание | Круглосуточно, скорректировать по данным |

**Почему так со ставками:** истории конверсий у кампании ещё нет, поэтому первые 2–3 недели дешевле собирать данные на «Максимум кликов» с потолком CPC, а уже потом отдавать управление автоставке.

---

## 2. Минус-слова (общий список `HS – Negativos`)

Применить на уровне кампании. Защищает бюджет от чужого/нецелевого трафика (по данным: половина объёма — охотники за IKEA).

```
# Конкуренты / маркетплейсы
ikea, leroy merlin, leroy, merlin, jysk, conforama, carrefour, el corte ingles,
amazon, aliexpress, wallapop, milanuncios, vinted, ebay, maisons du monde, kave home
# Вторичка / «дёшево»
segunda mano, de segunda, ocasion, usado, usados, gratis, barato, baratos
# DIY / чертежи
diy, hazlo tu mismo, como hacer, hacer un, casero, plano, planos, tutorial, medidas
# Работа / курсы
trabajo, empleo, curso, cursos, formacion, aprender
# «Маникюр» не про мебель (для группы Mesa de manicura)
esmalte, semipermanente, semi permanente, torno, lampara, gel, kit uñas
# Прочее нецелевое
alquiler, alquilar, reparar, reparacion, restaurar, pintar, infantil, niña, niños, bebe
```

> Каждую неделю открывать **отчёт по поисковым запросам** и добавлять новые минус-слова — это главный рычаг чистки трафика на старте.

---

## 3. Группы объявлений

На €15/день стартуем с **3 групп** (Tocadores, Mesa de manicura, Consolas). Espejos — фаза 2, когда будет понятен CPL. Ключи — только **фраза + точное соответствие** (broad пока не включаем, для контроля бюджета).

### 3.1 Группа «Tocadores» → `https://hsmuebles.es/tocadores-loft`

**Ключевые слова**
```
Точное:  [tocador], [tocador maquillaje], [tocador de maquillaje],
         [tocador con espejo], [tocador con espejo y luz],
         [tocador maquillaje con luz], [tocador moderno], [tocador nordico]
Фраза:   "tocador maquillaje", "tocador con espejo", "tocador de maquillaje",
         "tocador con luz", "comprar tocador", "tocadores modernos"
```
> ⚠️ `[tocador]` — самый широкий (33 100/мес, часть трафика информационная). Следить за его CPL; если ест бюджет без лидов — поставить на паузу и оставить модификаторы (`tocador maquillaje`, `con espejo`).

**Объявление (RSA)** — URL показа путь `/Tocadores/Oferta`
*Заголовки (15):*
```
Tocadores de Diseño | Tocador con Espejo y Luz | Tocadores de Maquillaje
Tocador Maquillaje con Luz | Fabricación Propia | Envío a Toda España
Hasta -30% Esta Semana | Diseño Nórdico y Moderno | Tocadores HS Muebles
Calidad de Fábrica | Con Espejo y Cajones | Compra Online Fácil
Estilo para tu Dormitorio | Tu Rincón de Belleza | Oferta Tiempo Limitado
```
*Описания (4):*
```
1. Tocadores de maquillaje con espejo, luz y almacenaje. Diseño premium. Envío a toda España.
2. Fabricación propia y calidad de fábrica. Descubre tu tocador ideal. Oferta hasta -30%.
3. Diseño nórdico y moderno para tu dormitorio. Compra online fácil y segura. ¡Pídelo hoy!
4. Espejo, luz LED y cajones. El tocador para tu ritual diario. Envío rápido a toda España.
```

---

### 3.2 Группа «Mesa de manicura» → `https://hsmuebles.es/mesas-de-manicura`

> Ниша с низкой конкуренцией от сетевиков, покупатель — салоны/мастера. Лучший ROI, дешевле «владеть».

**Ключевые слова**
```
Точное:  [mesa de manicura], [mesa manicura], [mesa de manicura profesional],
         [mesa manicura profesional], [mesa para manicura]
Фраза:   "mesa de manicura", "mesa manicura profesional",
         "comprar mesa de manicura", "mesa manicura"
```

**Объявление (RSA)** — путь `/Manicura/Profesional`
*Заголовки (15):*
```
Mesas de Manicura Pro | Mesa de Manicura | Para tu Centro de Estética
Diseño y Resistencia | Fabricación Propia | Envío a Toda España
Mesas Manicura HS Muebles | Equipa tu Salón | Con Cajones y Espacio
Calidad de Fábrica | Hasta -30% Esta Semana | Estética Serena
Precisión y Estilo | Compra Online Fácil | Mesa Manicura Profesional
```
*Описания (4):*
```
1. Mesas de manicura profesionales: diseño, cajones y resistencia. Equipa tu salón. Envío ES.
2. Fabricación propia a precio de fábrica. La mesa ideal para tu centro de estética. -30%.
3. Precisión y estética serena para tu trabajo. Compra online y recíbela en toda España.
4. Diseño resistente y funcional. Descubre nuestras mesas de manicura. ¡Pide la tuya hoy!
```

---

### 3.3 Группа «Consolas / Recibidor» → `https://hsmuebles.es/consolas`

**Ключевые слова**
```
Точное:  [consola recibidor], [consola entrada], [consola de entrada],
         [consola recibidor estrecha], [consola recibidor madera], [mueble recibidor]
Фраза:   "consola recibidor", "consola entrada", "mueble recibidor moderno",
         "consola estrecha recibidor", "comprar consola recibidor"
```

**Объявление (RSA)** — путь `/Consolas/Recibidor`
*Заголовки (15):*
```
Consolas de Recibidor | Consolas de Entrada | Muebles de Recibidor
Consola Estrecha y Fina | Diseño para tu Entrada | Fabricación Propia
Envío a Toda España | Hasta -30% Esta Semana | Consolas HS Muebles
Recibidor con Carácter | Calidad de Fábrica | Consola con Espejo
Compra Online Fácil | Estilo para tu Hogar | Consolas Modernas
```
*Описания (4):*
```
1. Consolas y muebles de recibidor de diseño. Estrechas, modernas y con espejo. Envío ES.
2. Da carácter a tu entrada. Fabricación propia y calidad de fábrica. Oferta hasta -30%.
3. Consolas finas y firmes para tu recibidor. Compra online fácil. Envío a toda España.
4. Diseño esencial para tu hogar. Descubre nuestras consolas. ¡Pide la tuya hoy mismo!
```

---

### 3.4 Группа «Espejos de pie» → `https://hsmuebles.es/espejos-de-cuerpo-entero` *(фаза 2, опционально)*

> Включать, когда по первым трём группам виден CPL ≤ €30 и бюджет не выбирается полностью (либо при повышении бюджета до ~€20/день). RSA ниже уже готов — добавление займёт 5 минут.

**Ключевые слова**
```
Точное:  [espejo de pie], [espejo cuerpo entero], [espejo de cuerpo entero], [espejo vestidor]
Фраза:   "espejo de pie", "espejo cuerpo entero", "espejo cuerpo completo", "espejo vestidor"
```

**Объявление (RSA)** — путь `/Espejos/CuerpoEntero`
*Заголовки (15):*
```
Espejos de Pie | Espejo de Cuerpo Entero | Espejo Vestidor
Diseño para tu Dormitorio | Fabricación Propia | Envío a Toda España
Hasta -30% Esta Semana | Espejos HS Muebles | Reflejo de Cuerpo Entero
Calidad de Fábrica | Marco Elegante | Compra Online Fácil
Espejo de Pie con Estilo | Para Vestidor o Cuarto | Espejos Modernos
```
*Описания (4):*
```
1. Espejos de pie de cuerpo entero. Diseño elegante para dormitorio o vestidor. Envío ES.
2. Fabricación propia y calidad de fábrica. Encuentra tu espejo ideal. Oferta hasta -30%.
3. Reflejo de cuerpo entero con marco de diseño. Compra online. Envío a toda España.
4. Dale amplitud a tu cuarto. Descubre nuestros espejos de pie. ¡Pídelo hoy mismo!
```

---

## 4. Общие ассеты (уровень кампании)

**Sitelinks (ссылки)**
| Текст | URL | Описание 1 | Описание 2 |
|---|---|---|---|
| Tocadores | /tocadores-loft | Con espejo, luz y cajones | Diseño moderno y nórdico |
| Mesas de manicura | /mesas-de-manicura | Para tu centro de estética | Diseño profesional resistente |
| Consolas de recibidor | /consolas | Estrechas, finas y modernas | Da carácter a tu entrada |
| Espejos cuerpo entero | /espejos-de-cuerpo-entero | Reflejo de cuerpo entero | Marco elegante de diseño |

**Callouts (уточнения)**
```
Envío a toda España · Fabricación propia · Hasta -30% de descuento
Atención personalizada · Pago 100% seguro · Calidad de fábrica
```

**Structured snippet — заголовок «Tipos»**
```
Tocadores · Mesas de manicura · Espejos · Consolas · Cómodas · Estanterías
```

> Все 4 типа ассетов заметно поднимают CTR и «силу объявления». Включить обязательно.

---

## 5. Стоимость кампании и объявлений

### 5.1 Из чего складывается стоимость

- **Создание кампании, объявлений и ассетов — €0.** Google Ads не берёт платы за настройку, количество объявлений, ключей или расширений.
- **Платите только за клики (CPC).** Показы бесплатны. Деньги списываются, когда пользователь кликает по объявлению.
- **Бюджет:** €15/день. Google может потратить до 2× дневного бюджета в отдельный день, но за месяц не превысит `15 × 30,4 ≈ €456`.
- **Списания:** по порогу биллинга или в конце месяца (постоплата). Предоплаты не требуется, но способ оплаты обязателен.
- **IVA:** счета выставляет Google Ireland — для испанского бизнеса с NIF действует reverse charge (inversión del sujeto pasivo), т.е. €456 — это чистый рекламный расход, НДС Google не добавляет.

### 5.2 Три сценария (бюджет €456/мес)

Допущения: сайт→лид (CVR) и CPC варьируются; лид→продажа 25% · AOV €395 · маржа 45%.

| Метрика | Пессимистичный | Базовый | Оптимистичный |
|---|---|---|---|
| Средний CPC | €0,55 | €0,45 | €0,35 |
| Клики/мес | ~830 | ~1 010 | ~1 300 |
| CVR сайта | 1,5% | 2% | 2,5% |
| Лиды (формы) | ~12 | ~20 | ~33 |
| **Цена лида (CPL)** | **~€37** | **~€23** | **~€14** |
| Продажи | ~3 | ~5 | ~8 |
| Цена продажи | ~€150 | ~€90 | ~€56 |
| Выручка | ~€1 185 | ~€2 000 | ~€3 200 |
| ROAS | ~2,6x | ~4,4x | ~7,0x |
| Валовая прибыль после рекламы | ~€75 | ~€445 | ~€985 |

Первый месяц — обучающий, скорее ближе к пессимистичному сценарию; со 2-го месяца после чистки минус-словами и перехода на «Maximizar conversiones» ожидаемо движение к базовому.

### 5.3 Ожидаемое распределение бюджета по группам

Бюджет в Google Ads единый на кампанию — жёстко разбить по группам нельзя, Google распределяет по спросу. Прогноз по объёмам Keyword Planner:

| Группа | Ожидаемая доля | ~€/мес | Комментарий |
|---|---|---|---|
| Tocadores | 50–60% | ~€250 | Самый большой объём (33 100/мес по `tocador`), следить за CPL |
| Consolas | 25–30% | ~€125 | Средний объём, стабильный коммерческий интент |
| Mesa de manicura | 15–20% | ~€80 | Ниша, дешёвые клики, лучший ожидаемый ROI |

Рычаг контроля: если Tocadores съедает бюджет без лидов — пауза ключа `[tocador]` (широкий, часть трафика информационная), остаются модификаторы.

---

## 6. Чек-лист запуска

- [ ] Проверить, что конверсия **Lead** «Principal» и считается (отправить тестовую форму → увидеть в «Conversiones»)
- [ ] Создать кампанию с настройками из §1
- [ ] **Выключить** Search Partners + Display
- [ ] Добавить минус-список §2 на кампанию
- [ ] Создать 3 группы (§3.1–3.3), ключи по типам соответствия
- [ ] Залить RSA в каждую группу, проверить «силу объявления» = Buena/Excelente
- [ ] Добавить ассеты §4 (sitelinks, callouts, snippets)
- [ ] Проверить, что все final URL открываются

## 7. Ведение (недели 1–4)

- Еженедельно: отчёт по **поисковым запросам** → чистить минус-словами
- Сравнивать фактический **CPC** с планом €0,45; фактический **CVR** сайта
- После ~15–20 конверсий → сменить ставки на «Maximizar conversiones»
- Ставить на паузу ключи с расходом > 2× цены продажи и 0 конверсий
- Параллельно тестировать лендинги — конверсия сайта важнее размера бюджета

---

## 8. Пошаговая заливка в Google Ads (вручную)

Аккаунт `hs.muebles.es@gmail.com` · ID `720-846-1658`. Названия — по-испански (как в UI).

### Шаг 0. Проверки перед стартом
1. **Оплата.** Herramientas → Facturación → способ оплаты добавлен, иначе реклама не открутится.
2. **Конверсия.** Herramientas → Conversiones → действие **Lead** есть и статус «Registrando conversiones» (или хотя бы «Sin actividad reciente», но тег стоит). Отправьте тестовую форму на сайте → через ~30–60 мин должна появиться конверсия.

### Шаг 1. Создать кампанию в «экспертном» режиме
1. `ads.google.com` → **Campañas** → синий **＋** → **Nueva campaña**.
2. Objetivo: выбрать **«Crear una campaña sin el asesoramiento de un objetivo»** (создать без цели) — это включает полный контроль и не даёт свалиться в Smart-кампанию.
3. Tipo de campaña: **Búsqueda**.
4. Resultados: оставить **«Visitas al sitio web»** выкл., просто продолжить. → **Continuar**.

### Шаг 2. Настройки кампании (критичные тумблеры)
1. Nombre: `HS · Search · ES · Muebles`.
2. **Redes:** снять обе галочки — «Incluir a los partners de la Red de Búsqueda» и «Incluir la Red de Display». (Иначе бюджет утечёт в нецелевой трафик.)
3. **Ubicaciones:** ввести **España** → раскрыть **«Opciones de ubicación»** → выбрать **«Presencia: personas que se encuentran en tus ubicaciones»** (НЕ «interesadas en»).
4. **Idiomas:** **Español**.
5. **Presupuesto:** `15` € в день. (Google может тратить до 2× в отдельный день, но в среднем за месяц ≈ €456.)
6. **Pujas:** «¿En qué quieres centrarte?» → **Clics** → отметить **«Establecer un límite de coste por clic máximo»** → `0,55` €.
   *(Позже, после ~15–20 конверсий: сменить на «Maximizar conversiones».)*
7. Recursos (assets) — можно добавить сейчас или на Шаге 5. → **Continuar/Siguiente**.

### Шаг 3. Группы объявлений и ключи
1. Первая группа: имя **`Tocadores`**.
2. В поле ключевых слов вставить блок из §3.1. Синтаксис соответствия: точное = `[слово]`, фраза = `"слово"`.
3. Добавить группу (**＋ Nuevo grupo de anuncios**) **`Mesa de manicura`** → ключи §3.2.
4. Добавить группу **`Consolas`** → ключи §3.3. *(Espejos §3.4 — позже, фаза 2.)*

### Шаг 4. Объявления (RSA) — по одному на группу
Для каждой группы **＋ → Anuncio de búsqueda responsivo**:
1. **URL final:** страница группы (Tocadores → `https://hsmuebles.es/tocadores-loft`, Manicura → `/mesas-de-manicura`, Consolas → `/consolas`).
2. **Ruta de visualización** (Path1/Path2): напр. `Tocadores` / `Oferta`.
3. Вставить **15 заголовков** и **4 описания** из нужного пункта §3. Ничего не «пинить».
4. Справа **«Eficacia del anuncio»** должна быть **Buena/Excelente**. → Guardar.

### Шаг 5. Ассеты (расширения) — уровень кампании
Anuncios y recursos → **Recursos** → добавить:
- **Enlaces de sitio** (§4, 4 шт. с описаниями),
- **Textos destacados** (Callouts, §4, 6 шт.),
- **Fragmentos estructurados** → заголовок **«Tipos»** → значения §4.

### Шаг 6. Минус-слова
Palabras clave → вкладка **«Palabras clave negativas»** → **＋** → уровень **Campaña** → вставить список §2. (Можно сохранить как список **«HS – Negativos»** для переиспользования.)

### Шаг 7. Публикация
**Publicar campaña**. Модерация Google обычно до 1 рабочего дня. Сразу после — держать кампанию на **паузе не нужно**, но проверить, что бюджет/оплата активны.

### Шаг 8. Первые дни
См. §7 «Ведение»: через 3–4 дня открыть **Términos de búsqueda**, вычистить мусор минус-словами, следить за фактическим CPC и конверсиями.
