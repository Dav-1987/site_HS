// Single source of truth for all UI copy. Category names/descriptions live in
// data/catalog.js (also bilingual). Keep keys flat-ish and grouped by area.

export const translations = {
  es: {
    // --- Navigation ---
    'nav.home': 'Inicio',
    'nav.catalog': 'Catálogo',
    'nav.contact': 'Contacto',
    'nav.reviews': 'Opiniones',
    'nav.menu': 'Menú',
    'nav.close': 'Cerrar',

    // --- Hero ---
    'hero.eyebrow': 'Muebles de diseño · Hecho en España',
    'hero.title.1': 'Confort y estilo',
    'hero.title.2': 'para su',
    'hero.title.3': '',
    'hero.subtitle': 'Espejos, tocadores y estanterías de diseño propio. Envío a toda España.',
    'hero.promo': '¡Grandes descuentos en toda la colección!',
    'hero.cta': 'Ver catálogo',

    // --- Sections ---
    'section.categories.eyebrow': 'Colecciones',
    'section.categories.title': 'Explora por categoría',
    'section.featured.eyebrow': 'Selección',
    'section.featured.title': 'Piezas destacadas',

    // --- Catalog page ---
    'catalog.eyebrow': 'Catálogo',
    'catalog.title': 'Todas las colecciones',
    'catalog.subtitle': 'Nueve familias de mobiliario, un mismo lenguaje minimalista.',

    // --- SEO meta (page <title>/<meta description>, not visible UI copy) ---
    'home.meta.title': 'Mirage Muebles | Espejos, tocadores y muebles de diseño | España',
    'home.meta.description':
      'Espejos, tocadores, estanterías, consolas y cómodas de diseño minimalista. Envío a toda España, montaje incluido.',
    'home.og.title': 'Mirage Muebles | Muebles de diseño minimalista',
    'home.og.description':
      'Espejos, tocadores y muebles de diseño minimalista. Envío a toda España.',
    'catalog.meta.title': 'Catálogo de muebles | Mirage Muebles',
    'catalog.meta.description':
      'Explora las {count} colecciones de Mirage Muebles: tocadores loft, espejos de cuerpo entero, estanterías, cómodas, consolas y mesas de manicura. Diseño minimalista.',
    'catalog.og.title': 'Catálogo completo | Mirage Muebles',
    'catalog.og.description':
      '{count} colecciones de mobiliario minimalista: tocadores, espejos, cómodas y más.',
    'category.meta.title': '{name} | Mirage Muebles',
    'category.meta.description':
      'Colección {name} de Mirage Muebles: {count} piezas de diseño minimalista. Envío a toda España, montaje incluido en la entrega.',
    'contact.meta.description':
      'Contacta con Mirage Muebles, tienda de muebles de diseño en España. Teléfono, email, Instagram y TikTok. Envío a toda España.',
    'contact.og.description':
      'Contacta con Mirage Muebles. Muebles de diseño minimalista con envío a toda España.',

    // --- Category / product ---
    'category.products': 'piezas',
    'category.empty': 'Próximamente nuevas piezas en esta colección.',
    'category.related': 'Otras colecciones',
    'product.from': 'Desde',
    'product.view': 'Ver detalles',
    'product.inquire': 'Consultar',
    'product.inquireNote': 'Te asesoramos sin compromiso.',
    'product.specsTitle': 'Características',
    'product.materialLabel': 'Material',
    'product.sizeLabel': 'Medidas',
    'product.dim.width': 'ancho',
    'product.dim.depth': 'prof.',
    'product.dim.height': 'altura',
    'product.dim.diameter': 'Ø',
    'product.dim.mirror': 'espejo',
    'product.dim.shelves': 'estanterías',
    'product.collectionLabel': 'Colección',
    'product.skuLabel': 'Referencia',
    'product.more': 'Ver más',
    'product.less': 'Ver menos',
    'product.detailsTitle': 'Sobre esta pieza',
    'product.related': 'También te puede gustar',
    'product.gallery': 'Vista',
    'product.video': 'Vídeo',
    'product.zoom': 'Ampliar',
    'product.soldOut': 'Agotado',
    'product.customOrderTitle': 'Fabricación a medida',
    'product.customOrderText':
      'Este artículo puede fabricarse en las dimensiones que necesites. Contáctanos para recibir presupuesto personalizado.',

    // --- Order modal ---
    'order.button': '¡PEDIR AHORA!',
    'order.perk.delivery': 'Envío a toda España',
    'order.perk.installation': 'Montaje incluido',
    'order.perk.bulbs': 'Bombillas LED de regalo',
    'order.perk.led': 'Iluminación LED profesional',
    'order.perk.quality': 'Calidad premium',
    'footer.emailCopied': 'Copiado ✓',
    'order.modal.eyebrow': 'Realizar pedido',
    'order.form.name': 'Nombre',
    'order.form.name.placeholder': 'Tu nombre',
    'order.form.country': 'País de entrega',
    'order.form.phone': 'Teléfono',
    'order.form.phone.placeholder': '+34 600 000 000',
    'order.form.postalCode': 'Código Postal',
    'order.form.postalCode.placeholder': '28001',
    'order.form.address': 'Dirección',
    'order.form.address.placeholder': 'Calle, número, ciudad',
    'order.form.comment': 'Comentarios adicionales',
    'order.form.comment.placeholder': '¿Algo que debamos saber?',
    'order.form.submit': 'Confirmar pedido',
    'order.form.privacyNotice': 'Al enviar este formulario, aceptas nuestra Política de Privacidad',
    'order.form.sending': 'Enviando…',
    'order.form.error.required': 'Este campo es obligatorio.',
    'order.form.error.phone': 'Introduce un número de teléfono válido.',
    'order.form.error.postalCode': 'Introduce un código postal válido.',
    'order.form.error.generic': 'Error al enviar. Inténtalo de nuevo.',
    'order.success.title': '¡Gracias, {name}!',
    'order.success.body': 'Nos pondremos en contacto contigo en breve.',

    // --- Contact ---
    'contact.eyebrow': 'Contacto',
    'contact.title': 'Contacto',
    'contact.subtitle': 'Escríbenos y te responderemos en menos de 24 horas laborables.',
    'contact.custom':
      'Vendemos modelos de catálogo, listos para enviar. En algún caso puntual podemos adaptar las medidas de un modelo: escríbenos y lo vemos.',
    'contact.prefill': 'Me interesa esta pieza:',
    'contact.form.name': 'Nombre',
    'contact.form.email': 'Correo electrónico',
    'contact.form.message': 'Mensaje',
    'contact.form.message.placeholder': 'Cuéntanos qué buscas…',
    'contact.form.submit': 'Enviar mensaje',
    'contact.form.sending': 'Enviando…',
    'contact.form.sent': 'Gracias, hemos recibido tu mensaje.',
    'contact.form.error.required': 'Este campo es obligatorio.',
    'contact.form.error.email': 'Introduce un correo electrónico válido.',
    'contact.form.error.generic': 'No se pudo enviar el mensaje. Inténtalo de nuevo.',
    'contact.info.title': 'Atelier',
    'contact.info.hours': 'Lun–Vie · 9:00–18:00',

    // --- A11y ---
    'a11y.skipToContent': 'Saltar al contenido',
    'notFound.text': 'La página que buscas no existe.',
    'error.boundary.title': 'Algo ha ido mal',
    'error.boundary.body':
      'Ha ocurrido un error inesperado. Inténtalo de nuevo o vuelve al inicio.',

    // --- A11y: carousel + lightbox ---
    'carousel.prev': 'Anterior',
    'carousel.next': 'Siguiente',
    'carousel.goTo': 'Ir a la pieza',
    'lightbox.label': 'Visor de imágenes',
    'lightbox.close': 'Cerrar',

    // --- Footer ---
    'footer.tagline': 'Muebles de diseño para dormitorio, recibidor y salón. Hechos en España.',
    'footer.explore': 'Explorar',
    'footer.company': 'Empresa',
    'footer.follow': 'Síguenos',
    'footer.rights': 'Todos los derechos reservados.',
    'footer.shipping': 'Envíos',
    'footer.returns': 'Devoluciones',
    'footer.legal': 'Aviso legal',
    'footer.privacy': 'Privacidad',

    // --- Privacy Policy ---
    'shipping.title': 'Envíos y entregas',
    'shipping.intro': 'Realizamos envíos a toda España.',
    'shipping.cost':
      'El coste del envío depende de la dirección de entrega. Te lo confirmamos antes de tramitar el pedido, junto con el resto de los datos.',
    'shipping.time':
      'El plazo de entrega habitual es de 3 a 5 días desde la confirmación del pedido.',
    'shipping.assembly':
      'El montaje está incluido en la entrega del producto, sin coste adicional. No se vende por separado.',
    'shipping.how':
      'Tras realizar el pedido desde la ficha del producto, te llamamos para confirmar la dirección, el coste del envío y la fecha de entrega.',
    'reviews.eyebrow': 'Opiniones',
    'reviews.title': 'Lo que dicen nuestros clientes',
    'reviews.intro':
      'Mensajes y vídeos que nos mandan nuestros clientes después de recibir el mueble. Publicados tal cual, sin retoques.',
    'reviews.all': 'Ver todas',
    'reviews.alt': 'Opinión de cliente',
    'reviews.empty': 'Todavía no hay opiniones publicadas.',
    'returns.title': 'Devoluciones',
    'returns.intro':
      'Dispones de 14 días desde la recepción del pedido para solicitar la devolución.',
    'returns.condition':
      'La devolución se realizará siempre que el embalaje esté intacto y el producto no presente ningún daño.',
    'returns.how':
      'Para iniciar una devolución, escríbenos o llámanos indicando tu nombre y el producto.',
    'returns.refund':
      'Una vez recibido y comprobado el producto, te devolvemos el importe abonado.',
    'policy.contact': 'Si tienes cualquier duda, escríbenos o llámanos:',
    'privacy.title': 'Política de Privacidad',
    'privacy.intro': 'Respetamos tu privacidad.',
    'privacy.p1':
      'Cuando envías una solicitud a través de nuestro sitio web, podemos recopilar tu nombre, número de teléfono, dirección de correo electrónico y cualquier otra información que decidas proporcionar.',
    'privacy.p2':
      'Utilizamos esta información únicamente para responder a tu solicitud, gestionar pedidos y ofrecer atención al cliente.',
    'privacy.p3': 'No vendemos tus datos personales a terceros.',
    'privacy.p4':
      'Si tienes alguna pregunta sobre tus datos personales, puedes contactarnos en {email}.',

    // --- Legal Notice ---
    'legal.title': 'Aviso Legal',
    'legal.companyLabel': 'Empresa',
    'legal.website': 'Sitio web',
    'legal.email': 'Correo electrónico',
    'legal.p1':
      'Todos los contenidos de este sitio web, incluidos textos, imágenes, gráficos y elementos de diseño, son propiedad de Mirage Muebles y no pueden ser copiados, reproducidos, distribuidos o utilizados sin autorización previa.',
    'legal.p2':
      'Mirage Muebles no se responsabiliza de los daños o perjuicios derivados del uso de este sitio web.',
    'legal.p3': 'Para cualquier consulta, puede contactarnos en {email}.',

    // --- Cookie banner ---
    'cookie.message':
      'Utilizamos cookies para mejorar tu experiencia y analizar el tráfico del sitio web.',
    'cookie.accept': 'Aceptar',
    'cookie.reject': 'Rechazar',

    // --- Common ---
    'common.viewAll': 'Ver todo',
    'common.loading': 'Cargando contenido',
    'common.currency': '€',
  },

  en: {
    // --- Navigation ---
    'nav.home': 'Home',
    'nav.catalog': 'Catalog',
    'nav.contact': 'Contact',
    'nav.reviews': 'Reviews',
    'nav.menu': 'Menu',
    'nav.close': 'Close',

    // --- Hero ---
    'hero.eyebrow': 'Designer furniture · Made in Spain',
    'hero.title.1': 'Comfort and style',
    'hero.title.2': 'for your',
    'hero.title.3': '',
    'hero.subtitle':
      'Mirrors, dressing tables and shelving of our own design. Delivery across Spain.',
    'hero.promo': 'Big discounts across the entire collection!',
    'hero.cta': 'View catalog',

    // --- Sections ---
    'section.categories.eyebrow': 'Collections',
    'section.categories.title': 'Explore by category',
    'section.featured.eyebrow': 'Selection',
    'section.featured.title': 'Featured pieces',

    // --- Catalog page ---
    'catalog.eyebrow': 'Catalog',
    'catalog.title': 'All collections',
    'catalog.subtitle': 'Nine furniture families, one minimalist language.',

    // --- SEO meta (page <title>/<meta description>, not visible UI copy) ---
    'home.meta.title': 'Mirage Muebles | Mirrors, Dressing Tables & Minimalist Design | Spain',
    'home.meta.description':
      'Mirrors, dressing tables, shelving, consoles and chests of drawers in minimalist design. Delivery across Spain, assembly included.',
    'home.og.title': 'Mirage Muebles | Minimalist Furniture',
    'home.og.description':
      'Mirrors, dressing tables and minimalist design furniture. Delivery across Spain.',
    'catalog.meta.title': 'Furniture Catalog | Mirage Muebles',
    'catalog.meta.description':
      "Explore Mirage Muebles' {count} collections: loft dressing tables, full-length mirrors, shelving, dressers, console tables and manicure tables. Minimalist design.",
    'catalog.og.title': 'Full Catalog | Mirage Muebles',
    'catalog.og.description':
      '{count} collections of minimalist furniture: vanities, mirrors, dressers and more.',
    'category.meta.title': '{name} | Mirage Muebles',
    'category.meta.description':
      '{name} collection by Mirage Muebles: {count} pieces of minimalist design. Delivery across Spain, assembly included.',
    'contact.meta.description':
      'Contact Mirage Muebles, a design furniture store in Spain. Phone, email, Instagram and TikTok. Delivery across Spain.',
    'contact.og.description':
      'Contact Mirage Muebles. Minimalist design furniture with delivery across Spain.',

    // --- Category / product ---
    'category.products': 'pieces',
    'category.empty': 'New pieces coming soon to this collection.',
    'category.related': 'Other collections',
    'product.from': 'From',
    'product.view': 'View details',
    'product.inquire': 'Inquire',
    'product.inquireNote': 'Free, no-obligation advice.',
    'product.specsTitle': 'Specifications',
    'product.materialLabel': 'Material',
    'product.sizeLabel': 'Dimensions',
    'product.dim.width': 'width',
    'product.dim.depth': 'depth',
    'product.dim.height': 'height',
    'product.dim.diameter': 'Ø',
    'product.dim.mirror': 'mirror',
    'product.dim.shelves': 'shelves',
    'product.collectionLabel': 'Collection',
    'product.skuLabel': 'Reference',
    'product.more': 'Read more',
    'product.less': 'Read less',
    'product.detailsTitle': 'About this piece',
    'product.related': 'You may also like',
    'product.gallery': 'View',
    'product.video': 'Video',
    'product.zoom': 'Zoom',
    'product.soldOut': 'Sold out',
    'product.customOrderTitle': 'Made to your measurements',
    'product.customOrderText':
      'This item can be made in any dimensions you need. Contact us for a personalised quote.',

    // --- Order modal ---
    'order.button': 'ORDER NOW!',
    'order.perk.delivery': 'Delivery across Spain',
    'order.perk.installation': 'Assembly included',
    'order.perk.bulbs': 'Free LED bulbs',
    'order.perk.led': 'Professional LED lighting',
    'order.perk.quality': 'Premium quality',
    'footer.emailCopied': 'Copied ✓',
    'order.modal.eyebrow': 'Place order',
    'order.form.name': 'Name',
    'order.form.name.placeholder': 'Your name',
    'order.form.country': 'Delivery country',
    'order.form.phone': 'Phone',
    'order.form.phone.placeholder': '+34 600 000 000',
    'order.form.postalCode': 'ZIP Code',
    'order.form.postalCode.placeholder': '28001',
    'order.form.address': 'Address',
    'order.form.address.placeholder': 'Street, number, city',
    'order.form.comment': 'Additional comments',
    'order.form.comment.placeholder': 'Anything we should know?',
    'order.form.submit': 'Confirm order',
    'order.form.privacyNotice': 'By submitting this form, you agree to our Privacy Policy',
    'order.form.sending': 'Sending…',
    'order.form.error.required': 'This field is required.',
    'order.form.error.phone': 'Enter a valid phone number.',
    'order.form.error.postalCode': 'Enter a valid ZIP code.',
    'order.form.error.generic': 'Failed to send. Please try again.',
    'order.success.title': 'Thank you, {name}!',
    'order.success.body': 'We will contact you shortly.',

    // --- Contact ---
    'contact.eyebrow': 'Contact',
    'contact.title': 'Contacts',
    'contact.subtitle': 'Write to us and we will reply within 24 working hours.',
    'contact.custom':
      'We sell catalogue models, ready to ship. In the occasional case we can adapt a model to your measurements — write to us and we will look into it.',
    'contact.prefill': "I'm interested in this piece:",
    'contact.form.name': 'Name',
    'contact.form.email': 'Email',
    'contact.form.message': 'Message',
    'contact.form.message.placeholder': 'Tell us what you are looking for…',
    'contact.form.submit': 'Send message',
    'contact.form.sending': 'Sending…',
    'contact.form.sent': 'Thank you, we have received your message.',
    'contact.form.error.required': 'This field is required.',
    'contact.form.error.email': 'Enter a valid email address.',
    'contact.form.error.generic': 'Could not send your message. Please try again.',
    'contact.info.title': 'Atelier',
    'contact.info.hours': 'Mon–Fri · 9:00–18:00',

    // --- A11y ---
    'a11y.skipToContent': 'Skip to content',
    'notFound.text': 'The page you are looking for does not exist.',
    'error.boundary.title': 'Something went wrong',
    'error.boundary.body': 'An unexpected error occurred. Please try again or go back home.',

    // --- A11y: carousel + lightbox ---
    'carousel.prev': 'Previous',
    'carousel.next': 'Next',
    'carousel.goTo': 'Go to item',
    'lightbox.label': 'Image viewer',
    'lightbox.close': 'Close',

    // --- Footer ---
    'footer.tagline': 'Designer furniture for the bedroom, hallway and living room. Made in Spain.',
    'footer.explore': 'Explore',
    'footer.company': 'Company',
    'footer.follow': 'Follow us',
    'footer.rights': 'All rights reserved.',
    'footer.shipping': 'Shipping',
    'footer.returns': 'Returns',
    'footer.legal': 'Legal notice',
    'footer.privacy': 'Privacy',

    // --- Privacy Policy ---
    'shipping.title': 'Shipping and delivery',
    'shipping.intro': 'We ship anywhere in Spain.',
    'shipping.cost':
      'The shipping cost depends on the delivery address. We confirm it with you before processing the order, along with the rest of the details.',
    'shipping.time': 'Delivery usually takes 3 to 5 days from order confirmation.',
    'shipping.assembly':
      'Assembly is included with the delivery of the product, at no extra cost. It is not sold separately.',
    'shipping.how':
      'Once you place your order from the product page, we call you to confirm the address, the shipping cost and the delivery date.',
    'reviews.eyebrow': 'Reviews',
    'reviews.title': 'What our customers say',
    'reviews.intro':
      'Messages and videos our customers send us after their furniture arrives. Published exactly as received, untouched.',
    'reviews.all': 'See all',
    'reviews.alt': 'Customer review',
    'reviews.empty': 'No reviews published yet.',
    'returns.title': 'Returns',
    'returns.intro': 'You have 14 days from receiving your order to request a return.',
    'returns.condition':
      'Returns are accepted provided the packaging is intact and the product shows no damage.',
    'returns.how':
      'To start a return, write to us or call us, telling us your name and the product.',
    'returns.refund': 'Once we have received and checked the product, we refund the amount paid.',
    'policy.contact': 'If you have any questions, write to us or call us:',
    'privacy.title': 'Privacy Policy',
    'privacy.intro': 'We respect your privacy.',
    'privacy.p1':
      'When you submit a request through our website, we may collect your name, phone number, email address, and other information you choose to provide.',
    'privacy.p2':
      'We use this information only to respond to your request, process orders, and provide customer support.',
    'privacy.p3': 'We do not sell your personal information to third parties.',
    'privacy.p4':
      'If you have any questions regarding your personal data, please contact us at {email}.',

    // --- Legal Notice ---
    'legal.title': 'Legal Notice',
    'legal.companyLabel': 'Company',
    'legal.website': 'Website',
    'legal.email': 'Email',
    'legal.p1':
      'All content on this website, including text, images, graphics and design elements, is the property of Mirage Muebles and may not be copied, reproduced, distributed or used without prior permission.',
    'legal.p2':
      'Mirage Muebles is not responsible for any damages resulting from the use of this website.',
    'legal.p3': 'For any questions, please contact us at {email}.',

    // --- Cookie banner ---
    'cookie.message': 'We use cookies to improve your experience and analyze website traffic.',
    'cookie.accept': 'Accept',
    'cookie.reject': 'Reject',

    // --- Common ---
    'common.viewAll': 'View all',
    'common.loading': 'Loading content',
    'common.currency': '€',
  },
};

export const LANGUAGES = [
  { code: 'es', label: 'ES' },
  { code: 'en', label: 'EN' },
];
