// 50 strategic content situations for OnlyFans engagement + sales.
// Each situation = a library of scenes that tell a story and hook the fan.

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
    { g: 'dia', emoji: '🏋️', name: 'Gimnasio', scenes: ['Camino al gimnasio', 'Entrenando', 'Descansando entre series', 'Post-entreno'] },
    { g: 'dia', emoji: '🍽️', name: 'Comida', scenes: ['Preparando desayuno', 'Cocinando', 'Cenando', 'Pidiendo comida'] },
    { g: 'dia', emoji: '🛍️', name: 'Compras', scenes: ['Comprando ropa', 'Comprando lencería', 'Supermercado', 'Comprando maquillaje'] },
    { g: 'dia', emoji: '💅', name: 'Belleza', scenes: ['Haciéndome las uñas', 'En el salón', 'Maquillándome', 'Rutina de skincare'] },
    { g: 'dia', emoji: '🚗', name: 'Transporte', scenes: ['En el carro', 'En Uber', 'En tráfico', 'Buscando parqueo'] },
    { g: 'dia', emoji: '🏠', name: 'Casa', scenes: ['Recién despertando', 'Limpiando', 'Organizando el cuarto', 'Viendo una película'] },
    { g: 'dia', emoji: '💼', name: 'Trabajo', scenes: ['Contestando mensajes', 'Grabando contenido', 'Sesión de fotos', 'Planeando la semana'] },
    { g: 'dia', emoji: '🐶', name: 'Mascotas', scenes: ['Paseando al perro', 'Jugando con mi gato', 'En el veterinario', 'Sofá con mi mascota'] },
    { g: 'dia', emoji: '🌧️', name: 'Día de lluvia', scenes: ['Lluvia y manta', 'Café y sudadera', 'Peli en la cama', 'Ventana empañada'] },
    { g: 'dia', emoji: '🔄', name: 'Rutina de la semana', scenes: ['Lunes flojo', 'Mitad de semana', 'Viernes de salida', 'Domingo en pijama'] },

    // ── Enganche & GFE ──
    { g: 'enganche', emoji: '💌', name: 'Novia virtual (GFE)', scenes: ['Buenos días desde la cama', 'Antes de dormir', 'Te extrañé hoy', 'Ojalá estuvieras aquí'] },
    { g: 'enganche', emoji: '❤️', name: 'Emociones', scenes: ['Hoy estoy feliz', 'Tuve un día difícil', 'Me siento sola', 'Estoy emocionada por algo'] },
    { g: 'enganche', emoji: '🌙', name: 'Madrugada', scenes: ['No puedo dormir', 'Mensaje de las 2 a.m.', 'Despierta conmigo', 'Insomnio contigo'] },
    { g: 'enganche', emoji: '🎊', name: 'Hitos contigo', scenes: ['1 mes juntos', 'Aniversario de suscripción', 'Gracias por estar', 'Nuestro recuerdo'] },
    { g: 'enganche', emoji: '🎙️', name: 'Notas de voz', scenes: ['Audio solo para ti', 'Susurro', 'Contándote mi día', 'Risa grabada'] },
    { g: 'enganche', emoji: '😏', name: 'Coqueteo', scenes: ['Mordiéndome el labio', 'Guiño para ti', 'Bailando para ti', 'Selfie al espejo'] },
    { g: 'enganche', emoji: '🛏️', name: 'Despertar juntos', scenes: ['Sábanas revueltas', 'Desayuno en cama', 'Buenos días perezosos', 'Abrazo de almohada'] },
    { g: 'enganche', emoji: '💍', name: 'Fantasía de pareja', scenes: ['Tu novia', 'Cena romántica en casa', 'Nuestra rutina', 'Planes juntos'] },
    { g: 'enganche', emoji: '🎬', name: 'Detrás de cámaras', scenes: ['Antes de la foto', 'Bloopers', 'Cómo se hizo', 'En el set'] },
    { g: 'enganche', emoji: '🎁', name: 'Regalos & wishlist', scenes: ['Abriendo tu regalo', 'Mi wishlist', 'Gracias por el detalle', 'Usando lo que me diste'] },

    // ── Fantasía & roleplay ──
    { g: 'fantasia', emoji: '🎭', name: 'POV / Fantasía', scenes: ['POV: llegaste a casa', 'POV: primera cita', 'POV: te desperté', 'Tu vecina traviesa'] },
    { g: 'fantasia', emoji: '👔', name: 'Roles profesionales', scenes: ['Oficinista', 'Enfermera', 'Azafata', 'Profesora'] },
    { g: 'fantasia', emoji: '🎃', name: 'Disfraces', scenes: ['Halloween', 'Cosplay', 'Fiesta temática', 'Personaje favorito'] },
    { g: 'fantasia', emoji: '🎞️', name: 'Roleplay cinematográfico', scenes: ['Escena de película', 'Personaje misterioso', 'Historia por capítulos', 'Final alternativo'] },
    { g: 'fantasia', emoji: '🎮', name: 'Gamer', scenes: ['Jugando de noche', 'Setup gamer', 'Perdí la apuesta', 'Jugamos juntos'] },
    { g: 'fantasia', emoji: '📚', name: 'Universidad', scenes: ['Estudiando tarde', 'Uniforme', 'En la biblioteca', 'Examen aprobado'] },
    { g: 'fantasia', emoji: '🏍️', name: 'Moto & aventura', scenes: ['En la moto', 'Casco y cuero', 'Carretera abierta', 'Escapada'] },
    { g: 'fantasia', emoji: '🎲', name: 'Tú decides', scenes: ['Elige mi outfit', 'Verdad o reto', 'Rueda de la suerte', 'Tú mandas hoy'] },
    { g: 'fantasia', emoji: '🎯', name: 'Pedidos personalizados', scenes: ['Tu pedido especial', 'Hecho solo para ti', 'Lo que me pediste', 'Custom exclusivo'] },
    { g: 'fantasia', emoji: '🎤', name: 'Música & baile', scenes: ['Cantando en el carro', 'Bailando en casa', 'Con audífonos', 'Playlist para ti'] },

    // ── Venta & urgencia ──
    { g: 'venta', emoji: '⏳', name: 'Ofertas y urgencia', scenes: ['Drop de medianoche', 'Solo por hoy', 'Últimas horas', 'Descuento sorpresa'] },
    { g: 'venta', emoji: '🔒', name: 'Solo para ti (VIP)', scenes: ['Esto no va a mi feed', 'Un secreto entre los dos', 'Regalo personalizado', 'Tu nombre en mi piel'] },
    { g: 'venta', emoji: '🏆', name: 'Metas & retos', scenes: ['Meta de tips', 'Reto de la semana', 'Si llegamos a…', 'Recompensa desbloqueada'] },
    { g: 'venta', emoji: '🔥', name: 'Provocación', scenes: ['Nueva lencería', '¿Adivina qué llevo?', 'Cambio de outfit', 'Debajo del vestido'] },
    { g: 'venta', emoji: '📦', name: 'Packs & bundles', scenes: ['Pack del mes', 'Combo especial', 'Colección completa', 'Lo más pedido'] },
    { g: 'venta', emoji: '🔔', name: 'Reactivación', scenes: ['Te fuiste sin despedirte', 'Volviste, te extrañé', 'Oferta de regreso', '¿Sigues ahí?'] },
    { g: 'venta', emoji: '👀', name: 'Adelantos', scenes: ['Sneak peek', 'Solo un pedacito', 'Lo que viene', 'Censurado por ahora'] },
    { g: 'venta', emoji: '📊', name: 'Encuestas', scenes: ['¿Cuál prefieres?', 'Vota el próximo set', 'A o B', 'Encuesta picante'] },
    { g: 'venta', emoji: '💬', name: 'Openers de chat', scenes: ['Rompiendo el hielo', 'Te tengo algo', '¿Adivina qué hice hoy?', 'Pensé en ti'] },
    { g: 'venta', emoji: '🎟️', name: 'Acceso limitado', scenes: ['Solo 10 personas', 'Invitación privada', 'Lista VIP', 'Se borra en 24 h'] },

    // ── Lifestyle premium ──
    { g: 'premium', emoji: '✈️', name: 'Viajes', scenes: ['Camino al aeropuerto', 'En el avión', 'Llegando al hotel', 'Conociendo la ciudad'] },
    { g: 'premium', emoji: '🏖️', name: 'Resort & vacaciones', scenes: ['Check-in en el resort', 'Cabaña frente al mar', 'Atardecer en la playa', 'Piña colada'] },
    { g: 'premium', emoji: '☀️', name: 'Playa & piscina', scenes: ['Día de piscina', 'Día de playa', 'Bronceándome', 'Mojada del mar'] },
    { g: 'premium', emoji: '🛀', name: 'Jacuzzi & spa', scenes: ['Jacuzzi de noche', 'Sauna privada', 'Baño de burbujas', 'Día de spa'] },
    { g: 'premium', emoji: '🚿', name: 'Ducha', scenes: ['Antes de la ducha', 'Vapor en el espejo', 'Solo una toalla', 'Pelo mojado'] },
    { g: 'premium', emoji: '💎', name: 'Lujo', scenes: ['Hotel de lujo', 'Joyas', 'Auto deportivo', 'Champaña'] },
    { g: 'premium', emoji: '🌆', name: 'Ciudad de noche', scenes: ['Luces de la ciudad', 'Rooftop', 'Taxi nocturno', 'Vitrinas de noche'] },
    { g: 'premium', emoji: '🍸', name: 'Bar & cocteles', scenes: ['Cóctel en la barra', 'Brindis', 'Noche de bar', 'Vino en casa'] },
    { g: 'premium', emoji: '🎉', name: 'Vida social', scenes: ['Antes de salir', 'En una fiesta', 'Después de la fiesta', 'Con amigas'] },
    { g: 'premium', emoji: '🧘', name: 'Yoga & wellness', scenes: ['Clase de yoga', 'Estirando en casa', 'Meditando', 'Ropa deportiva nueva'] },
  ],

  en: [
    // ── Day-to-day ──
    { g: 'dia', emoji: '🏋️', name: 'Gym', scenes: ['On my way to the gym', 'Working out', 'Resting between sets', 'Post-workout'] },
    { g: 'dia', emoji: '🍽️', name: 'Food', scenes: ['Making breakfast', 'Cooking', 'Having dinner', 'Ordering in'] },
    { g: 'dia', emoji: '🛍️', name: 'Shopping', scenes: ['Shopping for clothes', 'Shopping for lingerie', 'Grocery run', 'Buying makeup'] },
    { g: 'dia', emoji: '💅', name: 'Beauty', scenes: ['Getting my nails done', 'At the salon', 'Doing my makeup', 'Skincare routine'] },
    { g: 'dia', emoji: '🚗', name: 'Transport', scenes: ['In the car', 'In an Uber', 'Stuck in traffic', 'Looking for parking'] },
    { g: 'dia', emoji: '🏠', name: 'Home', scenes: ['Just waking up', 'Cleaning', 'Tidying my room', 'Watching a movie'] },
    { g: 'dia', emoji: '💼', name: 'Work', scenes: ['Answering messages', 'Filming content', 'At a photo shoot', 'Planning the week'] },
    { g: 'dia', emoji: '🐶', name: 'Pets', scenes: ['Walking my dog', 'Playing with my cat', 'At the vet', 'Couch with my pet'] },
    { g: 'dia', emoji: '🌧️', name: 'Rainy day', scenes: ['Rain and a blanket', 'Coffee and a hoodie', 'Movie in bed', 'Foggy window'] },
    { g: 'dia', emoji: '🔄', name: 'Weekly routine', scenes: ['Lazy Monday', 'Midweek', 'Friday night out', 'Sunday in pajamas'] },

    // ── Engagement & GFE ──
    { g: 'enganche', emoji: '💌', name: 'Virtual girlfriend (GFE)', scenes: ['Good morning from bed', 'Before bed', 'Missed you today', 'Wish you were here'] },
    { g: 'enganche', emoji: '❤️', name: 'Emotions', scenes: ['Feeling happy today', 'Had a rough day', 'Feeling lonely', 'Excited about something'] },
    { g: 'enganche', emoji: '🌙', name: 'Late night', scenes: ['Can’t sleep', '2 a.m. message', 'Stay up with me', 'Insomnia with you'] },
    { g: 'enganche', emoji: '🎊', name: 'Milestones with you', scenes: ['1 month together', 'Subscription anniversary', 'Thanks for being here', 'Our memory'] },
    { g: 'enganche', emoji: '🎙️', name: 'Voice notes', scenes: ['Audio just for you', 'A whisper', 'Telling you my day', 'Recorded laugh'] },
    { g: 'enganche', emoji: '😏', name: 'Flirting', scenes: ['Biting my lip', 'A wink for you', 'Dancing for you', 'Mirror selfie'] },
    { g: 'enganche', emoji: '🛏️', name: 'Waking up together', scenes: ['Messy sheets', 'Breakfast in bed', 'Lazy good morning', 'Pillow hug'] },
    { g: 'enganche', emoji: '💍', name: 'Couple fantasy', scenes: ['Your girlfriend', 'Romantic dinner at home', 'Our routine', 'Plans together'] },
    { g: 'enganche', emoji: '🎬', name: 'Behind the scenes', scenes: ['Before the shot', 'Bloopers', 'How it was made', 'On set'] },
    { g: 'enganche', emoji: '🎁', name: 'Gifts & wishlist', scenes: ['Opening your gift', 'My wishlist', 'Thanks for the gift', 'Wearing what you gave me'] },

    // ── Fantasy & roleplay ──
    { g: 'fantasia', emoji: '🎭', name: 'POV / Fantasy', scenes: ['POV: you got home', 'POV: first date', 'POV: I woke you up', 'Your naughty neighbor'] },
    { g: 'fantasia', emoji: '👔', name: 'Professional roles', scenes: ['Office worker', 'Nurse', 'Flight attendant', 'Teacher'] },
    { g: 'fantasia', emoji: '🎃', name: 'Costumes', scenes: ['Halloween', 'Cosplay', 'Themed party', 'Favorite character'] },
    { g: 'fantasia', emoji: '🎞️', name: 'Cinematic roleplay', scenes: ['Movie scene', 'Mystery character', 'Story in chapters', 'Alternate ending'] },
    { g: 'fantasia', emoji: '🎮', name: 'Gamer', scenes: ['Playing at night', 'Gamer setup', 'I lost the bet', 'Playing together'] },
    { g: 'fantasia', emoji: '📚', name: 'College', scenes: ['Studying late', 'Uniform', 'At the library', 'Passed the exam'] },
    { g: 'fantasia', emoji: '🏍️', name: 'Bike & adventure', scenes: ['On the bike', 'Helmet and leather', 'Open road', 'Getaway'] },
    { g: 'fantasia', emoji: '🎲', name: 'You decide', scenes: ['Pick my outfit', 'Truth or dare', 'Spin the wheel', 'You’re in charge today'] },
    { g: 'fantasia', emoji: '🎯', name: 'Custom requests', scenes: ['Your special request', 'Made just for you', 'What you asked for', 'Exclusive custom'] },
    { g: 'fantasia', emoji: '🎤', name: 'Music & dancing', scenes: ['Singing in the car', 'Dancing at home', 'With headphones', 'Playlist for you'] },

    // ── Sales & urgency ──
    { g: 'venta', emoji: '⏳', name: 'Offers & urgency', scenes: ['Midnight drop', 'Today only', 'Final hours', 'Surprise discount'] },
    { g: 'venta', emoji: '🔒', name: 'Just for you (VIP)', scenes: ['Not on my feed', 'A secret between us', 'Personalized gift', 'Your name on my skin'] },
    { g: 'venta', emoji: '🏆', name: 'Goals & challenges', scenes: ['Tip goal', 'Challenge of the week', 'If we hit…', 'Reward unlocked'] },
    { g: 'venta', emoji: '🔥', name: 'Teasing', scenes: ['New lingerie', 'Guess what I’m wearing', 'Outfit change', 'Under the dress'] },
    { g: 'venta', emoji: '📦', name: 'Packs & bundles', scenes: ['Pack of the month', 'Special combo', 'Full collection', 'Most requested'] },
    { g: 'venta', emoji: '🔔', name: 'Win-back', scenes: ['You left without saying bye', 'You’re back, I missed you', 'Welcome-back offer', 'Still there?'] },
    { g: 'venta', emoji: '👀', name: 'Previews', scenes: ['Sneak peek', 'Just a little piece', 'What’s coming', 'Censored for now'] },
    { g: 'venta', emoji: '📊', name: 'Polls', scenes: ['Which one do you prefer?', 'Vote the next set', 'A or B', 'Spicy poll'] },
    { g: 'venta', emoji: '💬', name: 'Chat openers', scenes: ['Breaking the ice', 'I’ve got something for you', 'Guess what I did today', 'Thought of you'] },
    { g: 'venta', emoji: '🎟️', name: 'Limited access', scenes: ['Only 10 people', 'Private invite', 'VIP list', 'Deletes in 24h'] },

    // ── Premium lifestyle ──
    { g: 'premium', emoji: '✈️', name: 'Travel', scenes: ['On my way to the airport', 'On the plane', 'Arriving at the hotel', 'Exploring the city'] },
    { g: 'premium', emoji: '🏖️', name: 'Resort & vacation', scenes: ['Resort check-in', 'Beachfront cabin', 'Sunset on the beach', 'Piña colada'] },
    { g: 'premium', emoji: '☀️', name: 'Beach & pool', scenes: ['Pool day', 'Beach day', 'Tanning', 'Wet from the sea'] },
    { g: 'premium', emoji: '🛀', name: 'Jacuzzi & spa', scenes: ['Jacuzzi at night', 'Private sauna', 'Bubble bath', 'Spa day'] },
    { g: 'premium', emoji: '🚿', name: 'Shower', scenes: ['Before the shower', 'Steam on the mirror', 'Just a towel', 'Wet hair'] },
    { g: 'premium', emoji: '💎', name: 'Luxury', scenes: ['Luxury hotel', 'Jewelry', 'Sports car', 'Champagne'] },
    { g: 'premium', emoji: '🌆', name: 'City at night', scenes: ['City lights', 'Rooftop', 'Night taxi', 'Window shopping at night'] },
    { g: 'premium', emoji: '🍸', name: 'Bar & cocktails', scenes: ['Cocktail at the bar', 'A toast', 'Bar night', 'Wine at home'] },
    { g: 'premium', emoji: '🎉', name: 'Social life', scenes: ['Before going out', 'At a party', 'After the party', 'With my girls'] },
    { g: 'premium', emoji: '🧘', name: 'Yoga & wellness', scenes: ['Yoga class', 'Stretching at home', 'Meditating', 'New workout set'] },
  ],
};
