// Italian (it) variant of GROUPS / LIBRARIES / AUDIO.
// Structure and order mirror the 'es' arrays in lib/libraries.js exactly.
// `g`, `icon` and `imgs` are byte-identical to the source — only user-facing text is translated.

export const GROUPS_IT = [
  { id: 'dia', name: 'La tua quotidianità' },
  { id: 'enganche', name: 'Coinvolgimento & GFE' },
  { id: 'fantasia', name: 'Fantasia & roleplay' },
  { id: 'venta', name: 'Vendita & urgenza' },
  { id: 'premium', name: 'Lifestyle premium' },
];

export const LIBRARIES_IT = [
  // ── La tua quotidianità ──
  { g: 'dia', icon: 'Dumbbell', name: 'Palestra', scenes: ['Verso la palestra', 'In allenamento', 'Pausa tra le serie', 'Post-allenamento'], imgs: ['/lib/gimnasio-camino.jpg', '/lib/gimnasio-entrenando.jpg', '/lib/gimnasio-descansando.jpg', '/lib/gimnasio-post-entreno.jpg'] },
  { g: 'dia', icon: 'UtensilsCrossed', name: 'Cibo', scenes: ['Preparando la colazione', 'Cucinando', 'A cena', 'Ordinando da mangiare'], imgs: ['/lib/comida-desayuno.jpg', '/lib/comida-cocinando.jpg', '/lib/comida-cenando.jpg', '/lib/comida-pidiendo.jpg'] },
  { g: 'dia', icon: 'ShoppingBag', name: 'Shopping', scenes: ['Comprando vestiti', 'Comprando lingerie', 'Al supermercato', 'Comprando trucchi'], imgs: ['/lib/compras-ropa.jpg', '/lib/compras-lenceria.jpg', '/lib/compras-super.jpg', '/lib/compras-maquillaje.jpg'] },
  { g: 'dia', icon: 'Brush', name: 'Bellezza', scenes: ['Facendomi le unghie', 'Al salone di bellezza', 'Truccandomi', 'Routine di skincare'], imgs: ['/lib/belleza-unas.jpg', '/lib/belleza-salon.jpg', '/lib/belleza-maquillaje.jpg', '/lib/belleza-skincare.jpg'] },
  { g: 'dia', icon: 'Car', name: 'Trasporti', scenes: ['In macchina', 'In Uber', 'Nel traffico', 'Cercando parcheggio'], imgs: ['/lib/transporte-carro.jpg', '/lib/transporte-uber.jpg', '/lib/transporte-trafico.jpg', '/lib/transporte-parqueo.jpg'] },
  { g: 'dia', icon: 'Home', name: 'Casa', scenes: ['Appena sveglia', 'Facendo le pulizie', 'Sistemando la stanza', 'Guardando un film'], imgs: ['/lib/casa-despertando.jpg', '/lib/casa-limpiando.jpg', '/lib/casa-organizando.jpg', '/lib/casa-pelicula.jpg'] },
  { g: 'dia', icon: 'Briefcase', name: 'Lavoro', scenes: ['Rispondendo ai messaggi', 'Registrando contenuti', 'Servizio fotografico', 'Pianificando la settimana'], imgs: ['/lib/trabajo-mensajes.jpg', '/lib/trabajo-grabando.jpg', '/lib/trabajo-sesion.jpg', '/lib/trabajo-planeando.jpg'] },
  { g: 'dia', icon: 'PawPrint', name: 'Animali', scenes: ['A spasso col cane', 'Giocando col mio gatto', 'Dal veterinario', 'Sul divano col mio cucciolo'], imgs: ['/lib/mascotas-perro.jpg', '/lib/mascotas-gato.jpg', '/lib/mascotas-veterinario.jpg', '/lib/mascotas-sofa.jpg'] },
  { g: 'dia', icon: 'CloudRain', name: 'Giorno di pioggia', scenes: ['Pioggia e coperta', 'Caffè e felpa', 'Film a letto', 'Finestra appannata'], imgs: ['/lib/lluvia-manta.jpg', '/lib/lluvia-cafe.jpg', '/lib/lluvia-peli.jpg', '/lib/lluvia-ventana.jpg'] },
  { g: 'dia', icon: 'CalendarDays', name: 'Routine della settimana', scenes: ['Lunedì pigro', 'Metà settimana', 'Venerdì sera fuori', 'Domenica in pigiama'], imgs: ['/lib/rutina-lunes.jpg', '/lib/rutina-semana.jpg', '/lib/rutina-viernes.jpg', '/lib/rutina-domingo.jpg'] },

  // ── Coinvolgimento & GFE ──
  { g: 'enganche', icon: 'Heart', name: 'Fidanzata virtuale (GFE)', scenes: ['Buongiorno dal letto', 'Prima di dormire', 'Mi sei mancato oggi', 'Vorrei che fossi qui'], imgs: ['/lib/gfe-buenosdias.jpg', '/lib/gfe-dormir.jpg', '/lib/gfe-extrane.jpg', '/lib/gfe-aqui.jpg'] },
  { g: 'enganche', icon: 'Smile', name: 'Emozioni', scenes: ['Oggi sono felice', 'Ho avuto una giornata difficile', 'Mi sento sola', 'Sono emozionata per qualcosa'], imgs: ['/lib/emociones-feliz.jpg', '/lib/emociones-dificil.jpg', '/lib/emociones-sola.jpg', '/lib/emociones-emocionada.jpg'] },
  { g: 'enganche', icon: 'Moon', name: 'Notte fonda', scenes: ['Non riesco a dormire', 'Messaggio delle 2 di notte', 'Resta sveglio con me', 'Insonnia con te'], imgs: ['/lib/madrugada-nodormir.jpg', '/lib/madrugada-2am.jpg', '/lib/madrugada-despierta.jpg', '/lib/madrugada-insomnio.jpg'] },
  { g: 'enganche', icon: 'PartyPopper', name: 'Traguardi con te', scenes: ['1 mese insieme', 'Anniversario di iscrizione', 'Grazie per esserci', 'Il nostro ricordo'], imgs: ['/lib/hitos-1mes.jpg', '/lib/hitos-aniversario.jpg', '/lib/hitos-gracias.jpg', '/lib/hitos-recuerdo.jpg'] },
  { g: 'enganche', icon: 'Quote', name: 'Confessioni', scenes: ['Ti racconto un segreto', 'Non l’ho mai detto a nessuno', 'La mia fantasia', 'Chiedimi quello che vuoi'], imgs: ['/lib/confesiones-secreto.jpg', '/lib/confesiones-nunca-dicho.jpg', '/lib/confesiones-fantasia.jpg', '/lib/confesiones-preguntame.jpg'] },
  { g: 'enganche', icon: 'Sparkles', name: 'Flirt', scenes: ['Mordendomi il labbro', 'Un occhiolino per te', 'Ballando per te', 'Selfie allo specchio'], imgs: ['/lib/coqueteo-labio.jpg', '/lib/coqueteo-guino.jpg', '/lib/coqueteo-bailando.jpg', '/lib/coqueteo-espejo.jpg'] },
  { g: 'enganche', icon: 'BedDouble', name: 'Svegliarsi insieme', scenes: ['Lenzuola stropicciate', 'Colazione a letto', 'Buongiorno pigro', 'Abbraccio al cuscino'], imgs: ['/lib/despertar-sabanas.jpg', '/lib/despertar-desayuno.jpg', '/lib/despertar-perezoso.jpg', '/lib/despertar-almohada.jpg'] },
  { g: 'enganche', icon: 'HeartHandshake', name: 'Fantasia di coppia', scenes: ['La tua ragazza', 'Cena romantica a casa', 'La nostra routine', 'Progetti insieme'], imgs: ['/lib/pareja-novia.jpg', '/lib/pareja-cena.jpg', '/lib/pareja-rutina.jpg', '/lib/pareja-planes.jpg'] },
  { g: 'enganche', icon: 'Clapperboard', name: 'Dietro le quinte', scenes: ['Prima della foto', 'Papere', 'Com’è stato fatto', 'Sul set'], imgs: ['/lib/bts-antes.jpg', '/lib/bts-bloopers.jpg', '/lib/bts-como.jpg', '/lib/bts-set.jpg'] },
  { g: 'enganche', icon: 'Gift', name: 'Regali & wishlist', scenes: ['Aprendo il tuo regalo', 'La mia wishlist', 'Grazie per il pensiero', 'Indossando quello che mi hai regalato'], imgs: ['/lib/regalos-abriendo.jpg', '/lib/regalos-wishlist.jpg', '/lib/regalos-gracias.jpg', '/lib/regalos-usando.jpg'] },

  // ── Fantasia & roleplay ──
  { g: 'fantasia', icon: 'Drama', name: 'POV / Fantasia', scenes: ['POV: sei tornato a casa', 'POV: primo appuntamento', 'POV: ti ho svegliato', 'La tua vicina birichina'], imgs: ['/lib/pov-casa.jpg', '/lib/pov-cita.jpg', '/lib/pov-desperte.jpg', '/lib/pov-vecina.jpg'] },
  { g: 'fantasia', icon: 'Shirt', name: 'Ruoli professionali', scenes: ['Impiegata', 'Infermiera', 'Hostess', 'Professoressa'], imgs: ['/lib/roles-oficinista.jpg', '/lib/roles-enfermera.jpg', '/lib/roles-azafata.jpg', '/lib/roles-profesora.jpg'] },
  { g: 'fantasia', icon: 'Ghost', name: 'Costumi', scenes: ['Halloween', 'Cosplay', 'Festa a tema', 'Personaggio preferito'], imgs: ['/lib/disfraces-halloween.jpg', '/lib/disfraces-cosplay.jpg', '/lib/disfraces-fiesta.jpg', '/lib/disfraces-personaje.jpg'] },
  { g: 'fantasia', icon: 'Film', name: 'Roleplay cinematografico', scenes: ['Scena da film', 'Personaggio misterioso', 'Storia a capitoli', 'Finale alternativo'], imgs: ['/lib/cine-escena.jpg', '/lib/cine-misterioso.jpg', '/lib/cine-capitulos.jpg', '/lib/cine-final.jpg'] },
  { g: 'fantasia', icon: 'Gamepad2', name: 'Gamer', scenes: ['Giocando di notte', 'Setup da gamer', 'Ho perso la scommessa', 'Giochiamo insieme'], imgs: ['/lib/gamer-noche.jpg', '/lib/gamer-setup.jpg', '/lib/gamer-apuesta.jpg', '/lib/gamer-juntos.jpg'] },
  { g: 'fantasia', icon: 'GraduationCap', name: 'Università', scenes: ['Studiando fino a tardi', 'Uniforme', 'In biblioteca', 'Esame superato'], imgs: ['/lib/universidad-estudiando.jpg', '/lib/universidad-uniforme.jpg', '/lib/universidad-biblioteca.jpg', '/lib/universidad-examen.jpg'] },
  { g: 'fantasia', icon: 'Route', name: 'Moto & avventura', scenes: ['In moto', 'Casco e pelle', 'Strada aperta', 'Una fuga'], imgs: ['/lib/moto-enlamoto.jpg', '/lib/moto-casco.jpg', '/lib/moto-carretera.jpg', '/lib/moto-escapada.jpg'] },
  { g: 'fantasia', icon: 'Dices', name: 'Decidi tu', scenes: ['Scegli il mio outfit', 'Obbligo o verità', 'Ruota della fortuna', 'Oggi comandi tu'], imgs: ['/lib/tudecides-outfit.jpg', '/lib/tudecides-verdad.jpg', '/lib/tudecides-rueda.jpg', '/lib/tudecides-mandas.jpg'] },
  { g: 'fantasia', icon: 'Target', name: 'Richieste personalizzate', scenes: ['La tua richiesta speciale', 'Fatto solo per te', 'Quello che mi hai chiesto', 'Custom esclusivo'], imgs: ['/lib/pedidos-especial.jpg', '/lib/pedidos-parati.jpg', '/lib/pedidos-loquepediste.jpg', '/lib/pedidos-custom.jpg'] },
  { g: 'fantasia', icon: 'Music', name: 'Musica & ballo', scenes: ['Cantando in macchina', 'Ballando a casa', 'Con le cuffie', 'Playlist per te'], imgs: ['/lib/musica-carro.jpg', '/lib/musica-baile.jpg', '/lib/musica-audifonos.jpg', '/lib/musica-playlist.jpg'] },

  // ── Vendita & urgenza ──
  { g: 'venta', icon: 'Timer', name: 'Offerte e urgenza', scenes: ['Drop di mezzanotte', 'Solo per oggi', 'Ultime ore', 'Sconto a sorpresa'], imgs: ['/lib/venta-drop-medianoche.jpg', '/lib/venta-solo-hoy.jpg', '/lib/venta-ultimas-horas.jpg', '/lib/venta-descuento-sorpresa.jpg'] },
  { g: 'venta', icon: 'Lock', name: 'Solo per te (VIP)', scenes: ['Questo non va nel mio feed', 'Un segreto tra noi due', 'Regalo personalizzato', 'Il tuo nome sulla mia pelle'], imgs: ['/lib/venta-nofeed.jpg', '/lib/venta-secreto.jpg', '/lib/venta-regalo.jpg', '/lib/venta-nombre-piel.jpg'] },
  { g: 'venta', icon: 'Trophy', name: 'Obiettivi & sfide', scenes: ['Obiettivo di tip', 'Sfida della settimana', 'Se arriviamo a…', 'Ricompensa sbloccata'], imgs: ['/lib/venta-meta-tips.jpg', '/lib/venta-reto-semana.jpg', '/lib/venta-si-llegamos.jpg', '/lib/venta-recompensa.jpg'] },
  { g: 'venta', icon: 'Flame', name: 'Provocazione', scenes: ['Lingerie nuova', 'Indovina cosa indosso?', 'Cambio d’outfit', 'Sotto il vestito'], imgs: ['/lib/venta-nueva-lenceria.jpg', '/lib/venta-adivina.jpg', '/lib/venta-cambio-outfit.jpg', '/lib/venta-debajo-vestido.jpg'] },
  { g: 'venta', icon: 'Package', name: 'Pack & bundle', scenes: ['Pack del mese', 'Combo speciale', 'Collezione completa', 'Il più richiesto'], imgs: ['/lib/venta-pack-mes.jpg', '/lib/venta-combo.jpg', '/lib/venta-coleccion.jpg', '/lib/venta-mas-pedido.jpg'] },
  { g: 'venta', icon: 'BellRing', name: 'Riattivazione', scenes: ['Te ne sei andato senza salutare', 'Sei tornato, mi sei mancato', 'Offerta di bentornato', 'Ci sei ancora?'], imgs: ['/lib/venta-fuiste.jpg', '/lib/venta-volviste.jpg', '/lib/venta-oferta-regreso.jpg', '/lib/venta-sigues-ahi.jpg'] },
  { g: 'venta', icon: 'Eye', name: 'Anteprime', scenes: ['Sneak peek', 'Solo un pezzettino', 'Quello che sta per arrivare', 'Censurato per ora'], imgs: ['/lib/venta-sneak-peek.jpg', '/lib/venta-pedacito.jpg', '/lib/venta-loquevendra.jpg', '/lib/venta-censurado.jpg'] },
  { g: 'venta', icon: 'BarChart3', name: 'Sondaggi', scenes: ['Quale preferisci?', 'Vota il prossimo set', 'A o B', 'Sondaggio piccante'], imgs: ['/lib/venta-cual-prefieres.jpg', '/lib/venta-vota-set.jpg', '/lib/venta-ab.jpg', '/lib/venta-encuesta-picante.jpg'] },
  { g: 'venta', icon: 'MessageCircle', name: 'Opener di chat', scenes: ['Rompendo il ghiaccio', 'Ho una cosa per te', 'Indovina cosa ho fatto oggi?', 'Ho pensato a te'], imgs: ['/lib/venta-hielo.jpg', '/lib/venta-tengo-algo.jpg', '/lib/venta-adivina-hoy.jpg', '/lib/venta-pense-en-ti.jpg'] },
  { g: 'venta', icon: 'Ticket', name: 'Accesso limitato', scenes: ['Solo 10 persone', 'Invito privato', 'Lista VIP', 'Si cancella in 24 h'], imgs: ['/lib/venta-solo10.jpg', '/lib/venta-invitacion.jpg', '/lib/venta-vip.jpg', '/lib/venta-borra24h.jpg'] },

  // ── Lifestyle premium ──
  { g: 'premium', icon: 'Plane', name: 'Viaggi', scenes: ['Verso l’aeroporto', 'In aereo', 'Arrivando in hotel', 'Esplorando la città'], imgs: ['/lib/viajes-aeropuerto.jpg', '/lib/viajes-avion.jpg', '/lib/viajes-hotel.jpg', '/lib/viajes-ciudad.jpg'] },
  { g: 'premium', icon: 'Hotel', name: 'Resort & vacanze', scenes: ['Check-in al resort', 'Bungalow fronte mare', 'Tramonto in spiaggia', 'Piña colada'], imgs: ['/lib/resort-checkin.jpg', '/lib/resort-cabana.jpg', '/lib/resort-atardecer.jpg', '/lib/resort-pinacolada.jpg'] },
  { g: 'premium', icon: 'Sun', name: 'Spiaggia & piscina', scenes: ['Giornata in piscina', 'Giornata al mare', 'Prendendo il sole', 'Bagnata dal mare'], imgs: ['/lib/playa-piscina.jpg', '/lib/playa-playa.jpg', '/lib/playa-bronceando.jpg', '/lib/playa-mojada.jpg'] },
  { g: 'premium', icon: 'Bath', name: 'Jacuzzi & spa', scenes: ['Jacuzzi di notte', 'Sauna privata', 'Bagno di schiuma', 'Giornata alla spa'], imgs: ['/lib/spa-jacuzzi-noche.jpg', '/lib/spa-sauna-privada.jpg', '/lib/spa-burbujas.jpg', '/lib/spa-dia.jpg'] },
  { g: 'premium', icon: 'Droplets', name: 'Doccia', scenes: ['Prima della doccia', 'Vapore sullo specchio', 'Solo un asciugamano', 'Capelli bagnati'], imgs: ['/lib/ducha-antes.jpg', '/lib/ducha-vapor.jpg', '/lib/ducha-toalla.jpg', '/lib/ducha-pelo.jpg'] },
  { g: 'premium', icon: 'Gem', name: 'Lusso', scenes: ['Hotel di lusso', 'Gioielli', 'Auto sportiva', 'Champagne'], imgs: ['/lib/lujo-hotel.jpg', '/lib/lujo-joyas.jpg', '/lib/lujo-auto.jpg', '/lib/lujo-champana.jpg'] },
  { g: 'premium', icon: 'Building2', name: 'Città di notte', scenes: ['Luci della città', 'Rooftop', 'Taxi notturno', 'Vetrine di notte'], imgs: ['/lib/ciudad-luces.jpg', '/lib/ciudad-rooftop.jpg', '/lib/ciudad-taxi.jpg', '/lib/ciudad-vitrinas.jpg'] },
  { g: 'premium', icon: 'Martini', name: 'Bar & cocktail', scenes: ['Cocktail al bancone', 'Brindisi', 'Serata al bar', 'Vino a casa'], imgs: ['/lib/bar-coctel.jpg', '/lib/bar-brindis.jpg', '/lib/bar-noche.jpg', '/lib/bar-vino.jpg'] },
  { g: 'premium', icon: 'Users', name: 'Vita sociale', scenes: ['Prima di uscire', 'A una festa', 'Dopo la festa', 'Con le amiche'], imgs: ['/lib/social-antes.jpg', '/lib/social-fiesta.jpg', '/lib/social-despues.jpg', '/lib/social-amigas.jpg'] },
  { g: 'premium', icon: 'Flower2', name: 'Yoga & wellness', scenes: ['Lezione di yoga', 'Stretching a casa', 'Meditando', 'Completo sportivo nuovo'], imgs: ['/lib/yoga-clase.jpg', '/lib/yoga-estirando.jpg', '/lib/yoga-meditando.jpg', '/lib/yoga-ropa.jpg'] },
];

// ── Audio: non ancora disponibile. Tenuto a parte, chiaramente segnato come in arrivo. ──
export const AUDIO_IT = {
  title: 'Audio',
  badge: 'Prossimamente',
  intro: 'Non lo offriamo ancora — oggi produciamo solo immagini e video. Ma ecco cosa sta arrivando, e aggancia tantissimo:',
  ideas: [
    { icon: 'Mic', name: 'Nota vocale personale', scenes: ['Buongiorno con il tuo nome', 'Raccontandoti la mia giornata', 'Prima di dormire'] },
    { icon: 'AudioLines', name: 'Sussurri / ASMR', scenes: ['Sussurro all’orecchio', 'Per rilassarti', 'Per dormire insieme'] },
    { icon: 'Headphones', name: 'Audio di fantasia', scenes: ['Storia narrata', 'Roleplay in audio', 'Scena solo per te'] },
    { icon: 'Volume2', name: 'Reazioni', scenes: ['Risata registrata', 'Reazione al tuo regalo', 'Grazie in audio'] },
  ],
};
