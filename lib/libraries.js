// 50 content STRATEGIES for OnlyFans engagement + sales.
// Each strategy = a set of scenes that tell a story and end in a sale.
// `icon` = lucide-react icon name (mapped in the page). No emojis: vector icons only.

export const GROUPS = {
  es: [
    { id: 'dia', name: 'Tu día a día' },
    { id: 'enganche', name: 'Enganche & GFE' },
    { id: 'fantasia', name: 'Fantasía & roleplay' },
    { id: 'venta', name: 'Venta & urgencia' },
    { id: 'premium', name: 'Lifestyle premium' },
  ],
  en: [
    { id: 'dia', name: 'Your day-to-day' },
    { id: 'enganche', name: 'Engagement & GFE' },
    { id: 'fantasia', name: 'Fantasy & roleplay' },
    { id: 'venta', name: 'Sales & urgency' },
    { id: 'premium', name: 'Premium lifestyle' },
  ],
};

export const LIBRARIES = {
  es: [
    // ── Tu día a día ──
    { g: 'dia', icon: 'Dumbbell', name: 'Gimnasio', scenes: ['Camino al gimnasio', 'Entrenando', 'Descansando entre series', 'Post-entreno'], imgs: ['/lib/gimnasio-camino.jpg', '/lib/gimnasio-entrenando.jpg', '/lib/gimnasio-descansando.jpg', '/lib/gimnasio-post-entreno.jpg'] },
    { g: 'dia', icon: 'UtensilsCrossed', name: 'Comida', scenes: ['Preparando desayuno', 'Cocinando', 'Cenando', 'Pidiendo comida'], imgs: ['/lib/comida-desayuno.jpg', '/lib/comida-cocinando.jpg', '/lib/comida-cenando.jpg', '/lib/comida-pidiendo.jpg'] },
    { g: 'dia', icon: 'ShoppingBag', name: 'Compras', scenes: ['Comprando ropa', 'Comprando lencería', 'Supermercado', 'Comprando maquillaje'], imgs: ['/lib/compras-ropa.jpg', '/lib/compras-lenceria.jpg', '/lib/compras-super.jpg', '/lib/compras-maquillaje.jpg'] },
    { g: 'dia', icon: 'Brush', name: 'Belleza', scenes: ['Haciéndome las uñas', 'En el salón', 'Maquillándome', 'Rutina de skincare'], imgs: ['/lib/belleza-unas.jpg', '/lib/belleza-salon.jpg', '/lib/belleza-maquillaje.jpg', '/lib/belleza-skincare.jpg'] },
    { g: 'dia', icon: 'Car', name: 'Transporte', scenes: ['En el carro', 'En Uber', 'En tráfico', 'Buscando parqueo'], imgs: ['/lib/transporte-carro.jpg', '/lib/transporte-uber.jpg', '/lib/transporte-trafico.jpg', '/lib/transporte-parqueo.jpg'] },
    { g: 'dia', icon: 'Home', name: 'Casa', scenes: ['Recién despertando', 'Limpiando', 'Organizando el cuarto', 'Viendo una película'], imgs: ['/lib/casa-despertando.jpg', '/lib/casa-limpiando.jpg', '/lib/casa-organizando.jpg', '/lib/casa-pelicula.jpg'] },
    { g: 'dia', icon: 'Briefcase', name: 'Trabajo', scenes: ['Contestando mensajes', 'Grabando contenido', 'Sesión de fotos', 'Planeando la semana'], imgs: ['/lib/trabajo-mensajes.jpg', '/lib/trabajo-grabando.jpg', '/lib/trabajo-sesion.jpg', '/lib/trabajo-planeando.jpg'] },
    { g: 'dia', icon: 'PawPrint', name: 'Mascotas', scenes: ['Paseando al perro', 'Jugando con mi gato', 'En el veterinario', 'Sofá con mi mascota'], imgs: ['/lib/mascotas-perro.jpg', '/lib/mascotas-gato.jpg', '/lib/mascotas-veterinario.jpg', '/lib/mascotas-sofa.jpg'] },
    { g: 'dia', icon: 'CloudRain', name: 'Día de lluvia', scenes: ['Lluvia y manta', 'Café y sudadera', 'Peli en la cama', 'Ventana empañada'], imgs: ['/lib/lluvia-manta.jpg', '/lib/lluvia-cafe.jpg', '/lib/lluvia-peli.jpg', '/lib/lluvia-ventana.jpg'] },
    { g: 'dia', icon: 'CalendarDays', name: 'Rutina de la semana', scenes: ['Lunes flojo', 'Mitad de semana', 'Viernes de salida', 'Domingo en pijama'], imgs: ['/lib/rutina-lunes.jpg', '/lib/rutina-semana.jpg', '/lib/rutina-viernes.jpg', '/lib/rutina-domingo.jpg'] },

    // ── Enganche & GFE ──
    { g: 'enganche', icon: 'Heart', name: 'Novia virtual (GFE)', scenes: ['Buenos días desde la cama', 'Antes de dormir', 'Te extrañé hoy', 'Ojalá estuvieras aquí'], imgs: ['/lib/gfe-buenosdias.jpg', '/lib/gfe-dormir.jpg', '/lib/gfe-extrane.jpg', '/lib/gfe-aqui.jpg'] },
    { g: 'enganche', icon: 'Smile', name: 'Emociones', scenes: ['Hoy estoy feliz', 'Tuve un día difícil', 'Me siento sola', 'Estoy emocionada por algo'], imgs: ['/lib/emociones-feliz.jpg', '/lib/emociones-dificil.jpg', '/lib/emociones-sola.jpg', '/lib/emociones-emocionada.jpg'] },
    { g: 'enganche', icon: 'Moon', name: 'Madrugada', scenes: ['No puedo dormir', 'Mensaje de las 2 a.m.', 'Despierta conmigo', 'Insomnio contigo'], imgs: ['/lib/madrugada-nodormir.jpg', '/lib/madrugada-2am.jpg', '/lib/madrugada-despierta.jpg', '/lib/madrugada-insomnio.jpg'] },
    { g: 'enganche', icon: 'PartyPopper', name: 'Hitos contigo', scenes: ['1 mes juntos', 'Aniversario de suscripción', 'Gracias por estar', 'Nuestro recuerdo'], imgs: ['/lib/hitos-1mes.jpg', '/lib/hitos-aniversario.jpg', '/lib/hitos-gracias.jpg', '/lib/hitos-recuerdo.jpg'] },
    { g: 'enganche', icon: 'Quote', name: 'Confesiones', scenes: ['Te cuento un secreto', 'Nunca se lo he dicho a nadie', 'Mi fantasía', 'Pregúntame lo que quieras'], imgs: ['/lib/confesiones-secreto.jpg', '/lib/confesiones-nunca-dicho.jpg', '/lib/confesiones-fantasia.jpg', '/lib/confesiones-preguntame.jpg'] },
    { g: 'enganche', icon: 'Sparkles', name: 'Coqueteo', scenes: ['Mordiéndome el labio', 'Guiño para ti', 'Bailando para ti', 'Selfie al espejo'], imgs: ['/lib/coqueteo-labio.jpg', '/lib/coqueteo-guino.jpg', '/lib/coqueteo-bailando.jpg', '/lib/coqueteo-espejo.jpg'] },
    { g: 'enganche', icon: 'BedDouble', name: 'Despertar juntos', scenes: ['Sábanas revueltas', 'Desayuno en cama', 'Buenos días perezosos', 'Abrazo de almohada'], imgs: ['/lib/despertar-sabanas.jpg', '/lib/despertar-desayuno.jpg', '/lib/despertar-perezoso.jpg', '/lib/despertar-almohada.jpg'] },
    { g: 'enganche', icon: 'HeartHandshake', name: 'Fantasía de pareja', scenes: ['Tu novia', 'Cena romántica en casa', 'Nuestra rutina', 'Planes juntos'], imgs: ['/lib/pareja-novia.jpg', '/lib/pareja-cena.jpg', '/lib/pareja-rutina.jpg', '/lib/pareja-planes.jpg'] },
    { g: 'enganche', icon: 'Clapperboard', name: 'Detrás de cámaras', scenes: ['Antes de la foto', 'Bloopers', 'Cómo se hizo', 'En el set'], imgs: ['/lib/bts-antes.jpg', '/lib/bts-bloopers.jpg', '/lib/bts-como.jpg', '/lib/bts-set.jpg'] },
    { g: 'enganche', icon: 'Gift', name: 'Regalos & wishlist', scenes: ['Abriendo tu regalo', 'Mi wishlist', 'Gracias por el detalle', 'Usando lo que me diste'], imgs: ['/lib/regalos-abriendo.jpg', '/lib/regalos-wishlist.jpg', '/lib/regalos-gracias.jpg', '/lib/regalos-usando.jpg'] },

    // ── Fantasía & roleplay ──
    { g: 'fantasia', icon: 'Drama', name: 'POV / Fantasía', scenes: ['POV: llegaste a casa', 'POV: primera cita', 'POV: te desperté', 'Tu vecina traviesa'], imgs: ['/lib/pov-casa.jpg', '/lib/pov-cita.jpg', '/lib/pov-desperte.jpg', '/lib/pov-vecina.jpg'] },
    { g: 'fantasia', icon: 'Shirt', name: 'Roles profesionales', scenes: ['Oficinista', 'Enfermera', 'Azafata', 'Profesora'], imgs: ['/lib/roles-oficinista.jpg', '/lib/roles-enfermera.jpg', '/lib/roles-azafata.jpg', '/lib/roles-profesora.jpg'] },
    { g: 'fantasia', icon: 'Ghost', name: 'Disfraces', scenes: ['Halloween', 'Cosplay', 'Fiesta temática', 'Personaje favorito'], imgs: ['/lib/disfraces-halloween.jpg', '/lib/disfraces-cosplay.jpg', '/lib/disfraces-fiesta.jpg', '/lib/disfraces-personaje.jpg'] },
    { g: 'fantasia', icon: 'Film', name: 'Roleplay cinematográfico', scenes: ['Escena de película', 'Personaje misterioso', 'Historia por capítulos', 'Final alternativo'], imgs: ['/lib/cine-escena.jpg', '/lib/cine-misterioso.jpg', '/lib/cine-capitulos.jpg', '/lib/cine-final.jpg'] },
    { g: 'fantasia', icon: 'Gamepad2', name: 'Gamer', scenes: ['Jugando de noche', 'Setup gamer', 'Perdí la apuesta', 'Jugamos juntos'] },
    { g: 'fantasia', icon: 'GraduationCap', name: 'Universidad', scenes: ['Estudiando tarde', 'Uniforme', 'En la biblioteca', 'Examen aprobado'] },
    { g: 'fantasia', icon: 'Route', name: 'Moto & aventura', scenes: ['En la moto', 'Casco y cuero', 'Carretera abierta', 'Escapada'] },
    { g: 'fantasia', icon: 'Dices', name: 'Tú decides', scenes: ['Elige mi outfit', 'Verdad o reto', 'Rueda de la suerte', 'Tú mandas hoy'] },
    { g: 'fantasia', icon: 'Target', name: 'Pedidos personalizados', scenes: ['Tu pedido especial', 'Hecho solo para ti', 'Lo que me pediste', 'Custom exclusivo'] },
    { g: 'fantasia', icon: 'Music', name: 'Música & baile', scenes: ['Cantando en el carro', 'Bailando en casa', 'Con audífonos', 'Playlist para ti'] },

    // ── Venta & urgencia ──
    { g: 'venta', icon: 'Timer', name: 'Ofertas y urgencia', scenes: ['Drop de medianoche', 'Solo por hoy', 'Últimas horas', 'Descuento sorpresa'] },
    { g: 'venta', icon: 'Lock', name: 'Solo para ti (VIP)', scenes: ['Esto no va a mi feed', 'Un secreto entre los dos', 'Regalo personalizado', 'Tu nombre en mi piel'] },
    { g: 'venta', icon: 'Trophy', name: 'Metas & retos', scenes: ['Meta de tips', 'Reto de la semana', 'Si llegamos a…', 'Recompensa desbloqueada'] },
    { g: 'venta', icon: 'Flame', name: 'Provocación', scenes: ['Nueva lencería', '¿Adivina qué llevo?', 'Cambio de outfit', 'Debajo del vestido'] },
    { g: 'venta', icon: 'Package', name: 'Packs & bundles', scenes: ['Pack del mes', 'Combo especial', 'Colección completa', 'Lo más pedido'] },
    { g: 'venta', icon: 'BellRing', name: 'Reactivación', scenes: ['Te fuiste sin despedirte', 'Volviste, te extrañé', 'Oferta de regreso', '¿Sigues ahí?'] },
    { g: 'venta', icon: 'Eye', name: 'Adelantos', scenes: ['Sneak peek', 'Solo un pedacito', 'Lo que viene', 'Censurado por ahora'] },
    { g: 'venta', icon: 'BarChart3', name: 'Encuestas', scenes: ['¿Cuál prefieres?', 'Vota el próximo set', 'A o B', 'Encuesta picante'] },
    { g: 'venta', icon: 'MessageCircle', name: 'Openers de chat', scenes: ['Rompiendo el hielo', 'Te tengo algo', '¿Adivina qué hice hoy?', 'Pensé en ti'] },
    { g: 'venta', icon: 'Ticket', name: 'Acceso limitado', scenes: ['Solo 10 personas', 'Invitación privada', 'Lista VIP', 'Se borra en 24 h'] },

    // ── Lifestyle premium ──
    { g: 'premium', icon: 'Plane', name: 'Viajes', scenes: ['Camino al aeropuerto', 'En el avión', 'Llegando al hotel', 'Conociendo la ciudad'] },
    { g: 'premium', icon: 'Hotel', name: 'Resort & vacaciones', scenes: ['Check-in en el resort', 'Cabaña frente al mar', 'Atardecer en la playa', 'Piña colada'] },
    { g: 'premium', icon: 'Sun', name: 'Playa & piscina', scenes: ['Día de piscina', 'Día de playa', 'Bronceándome', 'Mojada del mar'] },
    { g: 'premium', icon: 'Bath', name: 'Jacuzzi & spa', scenes: ['Jacuzzi de noche', 'Sauna privada', 'Baño de burbujas', 'Día de spa'], imgs: ['/lib/spa-jacuzzi-noche.jpg', '/lib/spa-sauna-privada.jpg', null, null] },
    { g: 'premium', icon: 'Droplets', name: 'Ducha', scenes: ['Antes de la ducha', 'Vapor en el espejo', 'Solo una toalla', 'Pelo mojado'] },
    { g: 'premium', icon: 'Gem', name: 'Lujo', scenes: ['Hotel de lujo', 'Joyas', 'Auto deportivo', 'Champaña'] },
    { g: 'premium', icon: 'Building2', name: 'Ciudad de noche', scenes: ['Luces de la ciudad', 'Rooftop', 'Taxi nocturno', 'Vitrinas de noche'] },
    { g: 'premium', icon: 'Martini', name: 'Bar & cocteles', scenes: ['Cóctel en la barra', 'Brindis', 'Noche de bar', 'Vino en casa'] },
    { g: 'premium', icon: 'Users', name: 'Vida social', scenes: ['Antes de salir', 'En una fiesta', 'Después de la fiesta', 'Con amigas'] },
    { g: 'premium', icon: 'Flower2', name: 'Yoga & wellness', scenes: ['Clase de yoga', 'Estirando en casa', 'Meditando', 'Ropa deportiva nueva'] },
  ],

  en: [
    // ── Day-to-day ──
    { g: 'dia', icon: 'Dumbbell', name: 'Gym', scenes: ['On my way to the gym', 'Working out', 'Resting between sets', 'Post-workout'], imgs: ['/lib/gimnasio-camino.jpg', '/lib/gimnasio-entrenando.jpg', '/lib/gimnasio-descansando.jpg', '/lib/gimnasio-post-entreno.jpg'] },
    { g: 'dia', icon: 'UtensilsCrossed', name: 'Food', scenes: ['Making breakfast', 'Cooking', 'Having dinner', 'Ordering in'], imgs: ['/lib/comida-desayuno.jpg', '/lib/comida-cocinando.jpg', '/lib/comida-cenando.jpg', '/lib/comida-pidiendo.jpg'] },
    { g: 'dia', icon: 'ShoppingBag', name: 'Shopping', scenes: ['Shopping for clothes', 'Shopping for lingerie', 'Grocery run', 'Buying makeup'], imgs: ['/lib/compras-ropa.jpg', '/lib/compras-lenceria.jpg', '/lib/compras-super.jpg', '/lib/compras-maquillaje.jpg'] },
    { g: 'dia', icon: 'Brush', name: 'Beauty', scenes: ['Getting my nails done', 'At the salon', 'Doing my makeup', 'Skincare routine'], imgs: ['/lib/belleza-unas.jpg', '/lib/belleza-salon.jpg', '/lib/belleza-maquillaje.jpg', '/lib/belleza-skincare.jpg'] },
    { g: 'dia', icon: 'Car', name: 'Transport', scenes: ['In the car', 'In an Uber', 'Stuck in traffic', 'Looking for parking'], imgs: ['/lib/transporte-carro.jpg', '/lib/transporte-uber.jpg', '/lib/transporte-trafico.jpg', '/lib/transporte-parqueo.jpg'] },
    { g: 'dia', icon: 'Home', name: 'Home', scenes: ['Just waking up', 'Cleaning', 'Tidying my room', 'Watching a movie'], imgs: ['/lib/casa-despertando.jpg', '/lib/casa-limpiando.jpg', '/lib/casa-organizando.jpg', '/lib/casa-pelicula.jpg'] },
    { g: 'dia', icon: 'Briefcase', name: 'Work', scenes: ['Answering messages', 'Filming content', 'At a photo shoot', 'Planning the week'], imgs: ['/lib/trabajo-mensajes.jpg', '/lib/trabajo-grabando.jpg', '/lib/trabajo-sesion.jpg', '/lib/trabajo-planeando.jpg'] },
    { g: 'dia', icon: 'PawPrint', name: 'Pets', scenes: ['Walking my dog', 'Playing with my cat', 'At the vet', 'Couch with my pet'], imgs: ['/lib/mascotas-perro.jpg', '/lib/mascotas-gato.jpg', '/lib/mascotas-veterinario.jpg', '/lib/mascotas-sofa.jpg'] },
    { g: 'dia', icon: 'CloudRain', name: 'Rainy day', scenes: ['Rain and a blanket', 'Coffee and a hoodie', 'Movie in bed', 'Foggy window'], imgs: ['/lib/lluvia-manta.jpg', '/lib/lluvia-cafe.jpg', '/lib/lluvia-peli.jpg', '/lib/lluvia-ventana.jpg'] },
    { g: 'dia', icon: 'CalendarDays', name: 'Weekly routine', scenes: ['Lazy Monday', 'Midweek', 'Friday night out', 'Sunday in pajamas'], imgs: ['/lib/rutina-lunes.jpg', '/lib/rutina-semana.jpg', '/lib/rutina-viernes.jpg', '/lib/rutina-domingo.jpg'] },

    // ── Engagement & GFE ──
    { g: 'enganche', icon: 'Heart', name: 'Virtual girlfriend (GFE)', scenes: ['Good morning from bed', 'Before bed', 'Missed you today', 'Wish you were here'], imgs: ['/lib/gfe-buenosdias.jpg', '/lib/gfe-dormir.jpg', '/lib/gfe-extrane.jpg', '/lib/gfe-aqui.jpg'] },
    { g: 'enganche', icon: 'Smile', name: 'Emotions', scenes: ['Feeling happy today', 'Had a rough day', 'Feeling lonely', 'Excited about something'], imgs: ['/lib/emociones-feliz.jpg', '/lib/emociones-dificil.jpg', '/lib/emociones-sola.jpg', '/lib/emociones-emocionada.jpg'] },
    { g: 'enganche', icon: 'Moon', name: 'Late night', scenes: ['Can’t sleep', '2 a.m. message', 'Stay up with me', 'Insomnia with you'], imgs: ['/lib/madrugada-nodormir.jpg', '/lib/madrugada-2am.jpg', '/lib/madrugada-despierta.jpg', '/lib/madrugada-insomnio.jpg'] },
    { g: 'enganche', icon: 'PartyPopper', name: 'Milestones with you', scenes: ['1 month together', 'Subscription anniversary', 'Thanks for being here', 'Our memory'], imgs: ['/lib/hitos-1mes.jpg', '/lib/hitos-aniversario.jpg', '/lib/hitos-gracias.jpg', '/lib/hitos-recuerdo.jpg'] },
    { g: 'enganche', icon: 'Quote', name: 'Confessions', scenes: ['Let me tell you a secret', 'I’ve never told anyone', 'My fantasy', 'Ask me anything'], imgs: ['/lib/confesiones-secreto.jpg', '/lib/confesiones-nunca-dicho.jpg', '/lib/confesiones-fantasia.jpg', '/lib/confesiones-preguntame.jpg'] },
    { g: 'enganche', icon: 'Sparkles', name: 'Flirting', scenes: ['Biting my lip', 'A wink for you', 'Dancing for you', 'Mirror selfie'], imgs: ['/lib/coqueteo-labio.jpg', '/lib/coqueteo-guino.jpg', '/lib/coqueteo-bailando.jpg', '/lib/coqueteo-espejo.jpg'] },
    { g: 'enganche', icon: 'BedDouble', name: 'Waking up together', scenes: ['Messy sheets', 'Breakfast in bed', 'Lazy good morning', 'Pillow hug'], imgs: ['/lib/despertar-sabanas.jpg', '/lib/despertar-desayuno.jpg', '/lib/despertar-perezoso.jpg', '/lib/despertar-almohada.jpg'] },
    { g: 'enganche', icon: 'HeartHandshake', name: 'Couple fantasy', scenes: ['Your girlfriend', 'Romantic dinner at home', 'Our routine', 'Plans together'], imgs: ['/lib/pareja-novia.jpg', '/lib/pareja-cena.jpg', '/lib/pareja-rutina.jpg', '/lib/pareja-planes.jpg'] },
    { g: 'enganche', icon: 'Clapperboard', name: 'Behind the scenes', scenes: ['Before the shot', 'Bloopers', 'How it was made', 'On set'], imgs: ['/lib/bts-antes.jpg', '/lib/bts-bloopers.jpg', '/lib/bts-como.jpg', '/lib/bts-set.jpg'] },
    { g: 'enganche', icon: 'Gift', name: 'Gifts & wishlist', scenes: ['Opening your gift', 'My wishlist', 'Thanks for the gift', 'Wearing what you gave me'], imgs: ['/lib/regalos-abriendo.jpg', '/lib/regalos-wishlist.jpg', '/lib/regalos-gracias.jpg', '/lib/regalos-usando.jpg'] },

    // ── Fantasy & roleplay ──
    { g: 'fantasia', icon: 'Drama', name: 'POV / Fantasy', scenes: ['POV: you got home', 'POV: first date', 'POV: I woke you up', 'Your naughty neighbor'], imgs: ['/lib/pov-casa.jpg', '/lib/pov-cita.jpg', '/lib/pov-desperte.jpg', '/lib/pov-vecina.jpg'] },
    { g: 'fantasia', icon: 'Shirt', name: 'Professional roles', scenes: ['Office worker', 'Nurse', 'Flight attendant', 'Teacher'], imgs: ['/lib/roles-oficinista.jpg', '/lib/roles-enfermera.jpg', '/lib/roles-azafata.jpg', '/lib/roles-profesora.jpg'] },
    { g: 'fantasia', icon: 'Ghost', name: 'Costumes', scenes: ['Halloween', 'Cosplay', 'Themed party', 'Favorite character'], imgs: ['/lib/disfraces-halloween.jpg', '/lib/disfraces-cosplay.jpg', '/lib/disfraces-fiesta.jpg', '/lib/disfraces-personaje.jpg'] },
    { g: 'fantasia', icon: 'Film', name: 'Cinematic roleplay', scenes: ['Movie scene', 'Mystery character', 'Story in chapters', 'Alternate ending'], imgs: ['/lib/cine-escena.jpg', '/lib/cine-misterioso.jpg', '/lib/cine-capitulos.jpg', '/lib/cine-final.jpg'] },
    { g: 'fantasia', icon: 'Gamepad2', name: 'Gamer', scenes: ['Playing at night', 'Gamer setup', 'I lost the bet', 'Playing together'] },
    { g: 'fantasia', icon: 'GraduationCap', name: 'College', scenes: ['Studying late', 'Uniform', 'At the library', 'Passed the exam'] },
    { g: 'fantasia', icon: 'Route', name: 'Bike & adventure', scenes: ['On the bike', 'Helmet and leather', 'Open road', 'Getaway'] },
    { g: 'fantasia', icon: 'Dices', name: 'You decide', scenes: ['Pick my outfit', 'Truth or dare', 'Spin the wheel', 'You’re in charge today'] },
    { g: 'fantasia', icon: 'Target', name: 'Custom requests', scenes: ['Your special request', 'Made just for you', 'What you asked for', 'Exclusive custom'] },
    { g: 'fantasia', icon: 'Music', name: 'Music & dancing', scenes: ['Singing in the car', 'Dancing at home', 'With headphones', 'Playlist for you'] },

    // ── Sales & urgency ──
    { g: 'venta', icon: 'Timer', name: 'Offers & urgency', scenes: ['Midnight drop', 'Today only', 'Final hours', 'Surprise discount'] },
    { g: 'venta', icon: 'Lock', name: 'Just for you (VIP)', scenes: ['Not on my feed', 'A secret between us', 'Personalized gift', 'Your name on my skin'] },
    { g: 'venta', icon: 'Trophy', name: 'Goals & challenges', scenes: ['Tip goal', 'Challenge of the week', 'If we hit…', 'Reward unlocked'] },
    { g: 'venta', icon: 'Flame', name: 'Teasing', scenes: ['New lingerie', 'Guess what I’m wearing', 'Outfit change', 'Under the dress'] },
    { g: 'venta', icon: 'Package', name: 'Packs & bundles', scenes: ['Pack of the month', 'Special combo', 'Full collection', 'Most requested'] },
    { g: 'venta', icon: 'BellRing', name: 'Win-back', scenes: ['You left without saying bye', 'You’re back, I missed you', 'Welcome-back offer', 'Still there?'] },
    { g: 'venta', icon: 'Eye', name: 'Previews', scenes: ['Sneak peek', 'Just a little piece', 'What’s coming', 'Censored for now'] },
    { g: 'venta', icon: 'BarChart3', name: 'Polls', scenes: ['Which one do you prefer?', 'Vote the next set', 'A or B', 'Spicy poll'] },
    { g: 'venta', icon: 'MessageCircle', name: 'Chat openers', scenes: ['Breaking the ice', 'I’ve got something for you', 'Guess what I did today', 'Thought of you'] },
    { g: 'venta', icon: 'Ticket', name: 'Limited access', scenes: ['Only 10 people', 'Private invite', 'VIP list', 'Deletes in 24h'] },

    // ── Premium lifestyle ──
    { g: 'premium', icon: 'Plane', name: 'Travel', scenes: ['On my way to the airport', 'On the plane', 'Arriving at the hotel', 'Exploring the city'] },
    { g: 'premium', icon: 'Hotel', name: 'Resort & vacation', scenes: ['Resort check-in', 'Beachfront cabin', 'Sunset on the beach', 'Piña colada'] },
    { g: 'premium', icon: 'Sun', name: 'Beach & pool', scenes: ['Pool day', 'Beach day', 'Tanning', 'Wet from the sea'] },
    { g: 'premium', icon: 'Bath', name: 'Jacuzzi & spa', scenes: ['Jacuzzi at night', 'Private sauna', 'Bubble bath', 'Spa day'], imgs: ['/lib/spa-jacuzzi-noche.jpg', '/lib/spa-sauna-privada.jpg', null, null] },
    { g: 'premium', icon: 'Droplets', name: 'Shower', scenes: ['Before the shower', 'Steam on the mirror', 'Just a towel', 'Wet hair'] },
    { g: 'premium', icon: 'Gem', name: 'Luxury', scenes: ['Luxury hotel', 'Jewelry', 'Sports car', 'Champagne'] },
    { g: 'premium', icon: 'Building2', name: 'City at night', scenes: ['City lights', 'Rooftop', 'Night taxi', 'Window shopping at night'] },
    { g: 'premium', icon: 'Martini', name: 'Bar & cocktails', scenes: ['Cocktail at the bar', 'A toast', 'Bar night', 'Wine at home'] },
    { g: 'premium', icon: 'Users', name: 'Social life', scenes: ['Before going out', 'At a party', 'After the party', 'With my girls'] },
    { g: 'premium', icon: 'Flower2', name: 'Yoga & wellness', scenes: ['Yoga class', 'Stretching at home', 'Meditating', 'New workout set'] },
  ],
};

// ── Audio: not offered yet. Kept apart, clearly marked as coming soon. ──
export const AUDIO = {
  es: {
    title: 'Audio',
    badge: 'Próximamente',
    intro: 'Todavía no lo ofrecemos — hoy producimos solo imagen y video. Pero esto es lo que viene, y engancha muchísimo:',
    ideas: [
      { icon: 'Mic', name: 'Nota de voz personal', scenes: ['Buenos días con tu nombre', 'Contándote mi día', 'Antes de dormir'] },
      { icon: 'AudioLines', name: 'Susurros / ASMR', scenes: ['Susurro al oído', 'Para relajarte', 'Para dormir juntos'] },
      { icon: 'Headphones', name: 'Audio de fantasía', scenes: ['Historia narrada', 'Roleplay en audio', 'Escena solo para ti'] },
      { icon: 'Volume2', name: 'Reacciones', scenes: ['Risa grabada', 'Reacción a tu regalo', 'Gracias en audio'] },
    ],
  },
  en: {
    title: 'Audio',
    badge: 'Coming soon',
    intro: 'We don’t offer it yet — today we produce photo and video only. But this is what’s coming, and it hooks hard:',
    ideas: [
      { icon: 'Mic', name: 'Personal voice note', scenes: ['Good morning with your name', 'Telling you my day', 'Before bed'] },
      { icon: 'AudioLines', name: 'Whispers / ASMR', scenes: ['A whisper in your ear', 'To relax you', 'To fall asleep together'] },
      { icon: 'Headphones', name: 'Fantasy audio', scenes: ['Narrated story', 'Audio roleplay', 'A scene just for you'] },
      { icon: 'Volume2', name: 'Reactions', scenes: ['Recorded laugh', 'Reacting to your gift', 'Thank-you audio'] },
    ],
  },
};
