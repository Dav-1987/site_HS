// Single source of truth for all UI copy. Category names/descriptions live in
// data/catalog.js (also bilingual). Keep keys flat-ish and grouped by area.

export const translations = {
  es: {
    // --- Navigation ---
    'nav.home': 'Inicio',
    'nav.catalog': 'Catálogo',
    'nav.contact': 'Contacto',
    'nav.cart': 'Cesta',
    'nav.menu': 'Menú',
    'nav.close': 'Cerrar',

    // --- Hero ---
    'hero.eyebrow': 'Mobiliario de tocador · Hecho en España',
    'hero.title.1': 'Confort y estilo',
    'hero.title.2': 'para su',
    'hero.title.3': '',
    'hero.subtitle': 'Creamos muebles de diseño único, adaptados a sus medidas y estilo.',
    'hero.promo': '¡Grandes descuentos en toda la colección!',
    'hero.promo.perks': 'Al pedir ahora: envío, montaje e instalación — totalmente gratis.',
    'hero.cta': 'Ver catálogo',

    // --- Sections ---
    'section.categories.eyebrow': 'Colecciones',
    'section.categories.title': 'Explora por categoría',
    'section.featured.eyebrow': 'Selección',
    'section.featured.title': 'Piezas destacadas',

    // --- Catalog page ---
    'catalog.eyebrow': 'Catálogo',
    'catalog.title': 'Todas las colecciones',
    'catalog.subtitle':
      'Nueve familias de mobiliario, un mismo lenguaje minimalista.',

    // --- Category / product ---
    'category.products': 'piezas',
    'category.back': 'Volver al catálogo',
    'category.empty': 'Próximamente nuevas piezas en esta colección.',
    'category.related': 'Otras colecciones',
    'product.from': 'Desde',
    'product.view': 'Ver detalles',
    'product.inquire': 'Consultar',
    'product.inquireNote': 'Te asesoramos sin compromiso.',
    'product.specsTitle': 'Características',
    'product.materialLabel': 'Material',
    'product.sizeLabel': 'Medidas',
    'product.collectionLabel': 'Colección',
    'product.skuLabel': 'Referencia',
    'product.detailsTitle': 'Sobre esta pieza',
    'product.related': 'También te puede gustar',
    'product.gallery': 'Vista',
    'product.video': 'Vídeo',
    'product.zoom': 'Ampliar',
    'product.customOrderTitle': 'Fabricación a medida',
    'product.customOrderText': 'Este artículo puede fabricarse en las dimensiones que necesites. Contáctanos para recibir presupuesto personalizado.',
    // --- Cart page ---
    'cart.eyebrow': 'Tu cesta',
    'cart.title': 'Cesta',
    'cart.empty': 'Tu cesta está vacía',
    'cart.browse': 'Ver catálogo',
    'cart.total': 'Total',
    'cart.note': 'Envío y montaje incluidos sin coste adicional.',
    'cart.item.remove': 'Eliminar',
    'cart.form.title': 'Datos del pedido',
    'cart.form.phone': 'Teléfono',
    'cart.form.email': 'Correo electrónico (opcional)',
    'cart.form.comment': 'Comentarios adicionales',
    'cart.form.comment.placeholder': '¿Algo que debamos saber?',
    'cart.form.submit': 'Confirmar pedido',
    'cart.form.sent.title': '¡Gracias por tu pedido!',
    'cart.form.sent.body': 'Nos pondremos en contacto contigo en breve para confirmar los detalles.',

    // --- Order modal ---
    'order.button': '¡PEDIR AHORA!',
    'order.shipping': 'Envío y montaje gratis',
    'footer.emailCopied': 'Copiado ✓',
    'order.modal.eyebrow': 'Solicitar producto',
    'order.form.name': 'Nombre',
    'order.form.name.placeholder': 'Tu nombre',
    'order.form.phone': 'Teléfono',
    'order.form.phone.placeholder': '+34 600 000 000',
    'order.form.comment': 'Comentarios adicionales',
    'order.form.comment.placeholder': '¿Algo que debamos saber?',
    'order.form.submit': 'Enviar solicitud',
    'order.form.sending': 'Enviando…',
    'order.form.error.required': 'Este campo es obligatorio.',
    'order.form.error.generic': 'Error al enviar. Inténtalo de nuevo.',
    'order.success.title': '¡Gracias, {name}!',
    'order.success.body': 'Nos pondremos en contacto contigo en breve.',

    // --- Contact ---
    'contact.eyebrow': 'Contacto',
    'contact.title': 'Contacto',
    'contact.subtitle':
      'Escríbenos y te responderemos en menos de 24 horas laborables.',
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

    // --- A11y: carousel + lightbox ---
    'carousel.prev': 'Anterior',
    'carousel.next': 'Siguiente',
    'carousel.goTo': 'Ir a la pieza',
    'lightbox.label': 'Visor de imágenes',
    'lightbox.close': 'Cerrar',

    // --- Footer ---
    'footer.tagline': 'Mobiliario de tocador minimalista, hecho en España.',
    'footer.explore': 'Explorar',
    'footer.company': 'Empresa',
    'footer.follow': 'Síguenos',
    'footer.rights': 'Todos los derechos reservados.',
    'footer.legal': 'Aviso legal',
    'footer.privacy': 'Privacidad',

    // --- Common ---
    'common.viewAll': 'Ver todo',
    'common.currency': '€',
  },

  en: {
    // --- Navigation ---
    'nav.home': 'Home',
    'nav.catalog': 'Catalog',
    'nav.contact': 'Contact',
    'nav.cart': 'Cart',
    'nav.menu': 'Menu',
    'nav.close': 'Close',

    // --- Hero ---
    'hero.eyebrow': 'Vanity furniture · Made in Spain',
    'hero.title.1': 'Comfort and style',
    'hero.title.2': 'for your',
    'hero.title.3': '',
    'hero.subtitle': 'We create uniquely designed furniture, tailored to your measurements and style.',
    'hero.promo': 'Big discounts across the entire collection!',
    'hero.promo.perks': 'Order now and get free delivery, assembly & installation.',
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

    // --- Category / product ---
    'category.products': 'pieces',
    'category.back': 'Back to catalog',
    'category.empty': 'New pieces coming soon to this collection.',
    'category.related': 'Other collections',
    'product.from': 'From',
    'product.view': 'View details',
    'product.inquire': 'Inquire',
    'product.inquireNote': 'Free, no-obligation advice.',
    'product.specsTitle': 'Specifications',
    'product.materialLabel': 'Material',
    'product.sizeLabel': 'Dimensions',
    'product.collectionLabel': 'Collection',
    'product.skuLabel': 'Reference',
    'product.detailsTitle': 'About this piece',
    'product.related': 'You may also like',
    'product.gallery': 'View',
    'product.video': 'Video',
    'product.zoom': 'Zoom',
    'product.customOrderTitle': 'Made to your measurements',
    'product.customOrderText': 'This item can be made in any dimensions you need. Contact us for a personalised quote.',
    // --- Cart page ---
    'cart.eyebrow': 'Your cart',
    'cart.title': 'Cart',
    'cart.empty': 'Your cart is empty',
    'cart.browse': 'Browse catalog',
    'cart.total': 'Total',
    'cart.note': 'Delivery and assembly included at no extra cost.',
    'cart.item.remove': 'Remove',
    'cart.form.title': 'Order details',
    'cart.form.phone': 'Phone',
    'cart.form.email': 'Email (optional)',
    'cart.form.comment': 'Additional comments',
    'cart.form.comment.placeholder': 'Anything we should know?',
    'cart.form.submit': 'Place order',
    'cart.form.sent.title': 'Thank you for your order!',
    'cart.form.sent.body': 'We will contact you shortly to confirm the details.',

    // --- Order modal ---
    'order.button': 'ORDER NOW!',
    'order.shipping': 'Free delivery and assembly',
    'footer.emailCopied': 'Copied ✓',
    'order.modal.eyebrow': 'Request product',
    'order.form.name': 'Name',
    'order.form.name.placeholder': 'Your name',
    'order.form.phone': 'Phone',
    'order.form.phone.placeholder': '+34 600 000 000',
    'order.form.comment': 'Additional comments',
    'order.form.comment.placeholder': 'Anything we should know?',
    'order.form.submit': 'Send request',
    'order.form.sending': 'Sending…',
    'order.form.error.required': 'This field is required.',
    'order.form.error.generic': 'Failed to send. Please try again.',
    'order.success.title': 'Thank you, {name}!',
    'order.success.body': 'We will contact you shortly.',

    // --- Contact ---
    'contact.eyebrow': 'Contact',
    'contact.title': 'Contacts',
    'contact.subtitle':
      'Write to us and we will reply within 24 working hours.',
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

    // --- A11y: carousel + lightbox ---
    'carousel.prev': 'Previous',
    'carousel.next': 'Next',
    'carousel.goTo': 'Go to item',
    'lightbox.label': 'Image viewer',
    'lightbox.close': 'Close',

    // --- Footer ---
    'footer.tagline': 'Minimalist vanity furniture, made in Spain.',
    'footer.explore': 'Explore',
    'footer.company': 'Company',
    'footer.follow': 'Follow us',
    'footer.rights': 'All rights reserved.',
    'footer.legal': 'Legal notice',
    'footer.privacy': 'Privacy',

    // --- Common ---
    'common.viewAll': 'View all',
    'common.currency': '€',
  },
};

export const LANGUAGES = [
  { code: 'es', label: 'ES' },
  { code: 'en', label: 'EN' },
];
