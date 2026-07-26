// 50 Content-STRATEGIEN für OnlyFans-Engagement + Verkäufe. (Deutsch)
// Jede Strategie = ein Set von Szenen, die eine Geschichte erzählen und mit einem Verkauf enden.
// `icon` = lucide-react Icon-Name (wird auf der Seite gemappt). Keine Emojis: nur Vektor-Icons.

export const GROUPS_DE = [
  { id: 'dia', name: 'Dein Alltag' },
  { id: 'enganche', name: 'Bindung & GFE' },
  { id: 'fantasia', name: 'Fantasie & Roleplay' },
  { id: 'venta', name: 'Verkauf & Dringlichkeit' },
  { id: 'premium', name: 'Premium-Lifestyle' },
];

export const LIBRARIES_DE = [
  // ── Dein Alltag ──
  { g: 'dia', icon: 'Dumbbell', name: 'Gym', scenes: ['Auf dem Weg ins Gym', 'Beim Training', 'Pause zwischen den Sätzen', 'Nach dem Workout'], imgs: ['/lib/gimnasio-camino.jpg', '/lib/gimnasio-entrenando.jpg', '/lib/gimnasio-descansando.jpg', '/lib/gimnasio-post-entreno.jpg'] },
  { g: 'dia', icon: 'UtensilsCrossed', name: 'Essen', scenes: ['Frühstück machen', 'Beim Kochen', 'Beim Abendessen', 'Essen bestellen'], imgs: ['/lib/comida-desayuno.jpg', '/lib/comida-cocinando.jpg', '/lib/comida-cenando.jpg', '/lib/comida-pidiendo.jpg'] },
  { g: 'dia', icon: 'ShoppingBag', name: 'Shopping', scenes: ['Klamotten shoppen', 'Dessous shoppen', 'Im Supermarkt', 'Make-up kaufen'], imgs: ['/lib/compras-ropa.jpg', '/lib/compras-lenceria.jpg', '/lib/compras-super.jpg', '/lib/compras-maquillaje.jpg'] },
  { g: 'dia', icon: 'Brush', name: 'Beauty', scenes: ['Nägel machen lassen', 'Im Salon', 'Beim Schminken', 'Skincare-Routine'], imgs: ['/lib/belleza-unas.jpg', '/lib/belleza-salon.jpg', '/lib/belleza-maquillaje.jpg', '/lib/belleza-skincare.jpg'] },
  { g: 'dia', icon: 'Car', name: 'Unterwegs', scenes: ['Im Auto', 'Im Uber', 'Im Stau', 'Parkplatz suchen'], imgs: ['/lib/transporte-carro.jpg', '/lib/transporte-uber.jpg', '/lib/transporte-trafico.jpg', '/lib/transporte-parqueo.jpg'] },
  { g: 'dia', icon: 'Home', name: 'Zuhause', scenes: ['Gerade aufgewacht', 'Beim Putzen', 'Zimmer aufräumen', 'Einen Film schauen'], imgs: ['/lib/casa-despertando.jpg', '/lib/casa-limpiando.jpg', '/lib/casa-organizando.jpg', '/lib/casa-pelicula.jpg'] },
  { g: 'dia', icon: 'Briefcase', name: 'Arbeit', scenes: ['Nachrichten beantworten', 'Content drehen', 'Beim Fotoshooting', 'Die Woche planen'], imgs: ['/lib/trabajo-mensajes.jpg', '/lib/trabajo-grabando.jpg', '/lib/trabajo-sesion.jpg', '/lib/trabajo-planeando.jpg'] },
  { g: 'dia', icon: 'PawPrint', name: 'Haustiere', scenes: ['Mit dem Hund spazieren', 'Mit meiner Katze spielen', 'Beim Tierarzt', 'Sofa mit meinem Haustier'], imgs: ['/lib/mascotas-perro.jpg', '/lib/mascotas-gato.jpg', '/lib/mascotas-veterinario.jpg', '/lib/mascotas-sofa.jpg'] },
  { g: 'dia', icon: 'CloudRain', name: 'Regentag', scenes: ['Regen und Kuscheldecke', 'Kaffee und Hoodie', 'Film im Bett', 'Beschlagenes Fenster'], imgs: ['/lib/lluvia-manta.jpg', '/lib/lluvia-cafe.jpg', '/lib/lluvia-peli.jpg', '/lib/lluvia-ventana.jpg'] },
  { g: 'dia', icon: 'CalendarDays', name: 'Wochenroutine', scenes: ['Fauler Montag', 'Mitte der Woche', 'Freitag zum Ausgehen', 'Sonntag im Pyjama'], imgs: ['/lib/rutina-lunes.jpg', '/lib/rutina-semana.jpg', '/lib/rutina-viernes.jpg', '/lib/rutina-domingo.jpg'] },

  // ── Bindung & GFE ──
  { g: 'enganche', icon: 'Heart', name: 'Virtuelle Freundin (GFE)', scenes: ['Guten Morgen aus dem Bett', 'Vor dem Schlafen', 'Hab dich heute vermisst', 'Wärst du doch hier'], imgs: ['/lib/gfe-buenosdias.jpg', '/lib/gfe-dormir.jpg', '/lib/gfe-extrane.jpg', '/lib/gfe-aqui.jpg'] },
  { g: 'enganche', icon: 'Smile', name: 'Emotionen', scenes: ['Heute bin ich glücklich', 'Hatte einen schweren Tag', 'Ich fühle mich einsam', 'Ich freue mich auf etwas'], imgs: ['/lib/emociones-feliz.jpg', '/lib/emociones-dificil.jpg', '/lib/emociones-sola.jpg', '/lib/emociones-emocionada.jpg'] },
  { g: 'enganche', icon: 'Moon', name: 'Späte Nacht', scenes: ['Ich kann nicht schlafen', 'Nachricht um 2 Uhr nachts', 'Bleib wach mit mir', 'Schlaflos mit dir'], imgs: ['/lib/madrugada-nodormir.jpg', '/lib/madrugada-2am.jpg', '/lib/madrugada-despierta.jpg', '/lib/madrugada-insomnio.jpg'] },
  { g: 'enganche', icon: 'PartyPopper', name: 'Meilensteine mit dir', scenes: ['1 Monat zusammen', 'Abo-Jubiläum', 'Danke, dass du da bist', 'Unsere Erinnerung'], imgs: ['/lib/hitos-1mes.jpg', '/lib/hitos-aniversario.jpg', '/lib/hitos-gracias.jpg', '/lib/hitos-recuerdo.jpg'] },
  { g: 'enganche', icon: 'Quote', name: 'Geständnisse', scenes: ['Ich verrate dir ein Geheimnis', 'Das habe ich noch niemandem gesagt', 'Meine Fantasie', 'Frag mich, was du willst'], imgs: ['/lib/confesiones-secreto.jpg', '/lib/confesiones-nunca-dicho.jpg', '/lib/confesiones-fantasia.jpg', '/lib/confesiones-preguntame.jpg'] },
  { g: 'enganche', icon: 'Sparkles', name: 'Flirten', scenes: ['Ich beiße mir auf die Lippe', 'Ein Zwinkern für dich', 'Ich tanze für dich', 'Spiegel-Selfie'], imgs: ['/lib/coqueteo-labio.jpg', '/lib/coqueteo-guino.jpg', '/lib/coqueteo-bailando.jpg', '/lib/coqueteo-espejo.jpg'] },
  { g: 'enganche', icon: 'BedDouble', name: 'Zusammen aufwachen', scenes: ['Zerwühlte Laken', 'Frühstück im Bett', 'Verschlafener guter Morgen', 'Kissen-Umarmung'], imgs: ['/lib/despertar-sabanas.jpg', '/lib/despertar-desayuno.jpg', '/lib/despertar-perezoso.jpg', '/lib/despertar-almohada.jpg'] },
  { g: 'enganche', icon: 'HeartHandshake', name: 'Paar-Fantasie', scenes: ['Deine Freundin', 'Romantisches Dinner zu Hause', 'Unsere Routine', 'Pläne zu zweit'], imgs: ['/lib/pareja-novia.jpg', '/lib/pareja-cena.jpg', '/lib/pareja-rutina.jpg', '/lib/pareja-planes.jpg'] },
  { g: 'enganche', icon: 'Clapperboard', name: 'Hinter den Kulissen', scenes: ['Vor dem Foto', 'Pannen & Bloopers', 'So ist es entstanden', 'Am Set'], imgs: ['/lib/bts-antes.jpg', '/lib/bts-bloopers.jpg', '/lib/bts-como.jpg', '/lib/bts-set.jpg'] },
  { g: 'enganche', icon: 'Gift', name: 'Geschenke & Wishlist', scenes: ['Ich öffne dein Geschenk', 'Meine Wishlist', 'Danke für die Aufmerksamkeit', 'Ich trage, was du mir geschenkt hast'], imgs: ['/lib/regalos-abriendo.jpg', '/lib/regalos-wishlist.jpg', '/lib/regalos-gracias.jpg', '/lib/regalos-usando.jpg'] },

  // ── Fantasie & Roleplay ──
  { g: 'fantasia', icon: 'Drama', name: 'POV / Fantasie', scenes: ['POV: Du bist nach Hause gekommen', 'POV: Erstes Date', 'POV: Ich habe dich geweckt', 'Deine freche Nachbarin'], imgs: ['/lib/pov-casa.jpg', '/lib/pov-cita.jpg', '/lib/pov-desperte.jpg', '/lib/pov-vecina.jpg'] },
  { g: 'fantasia', icon: 'Shirt', name: 'Berufsrollen', scenes: ['Büro-Girl', 'Krankenschwester', 'Stewardess', 'Lehrerin'], imgs: ['/lib/roles-oficinista.jpg', '/lib/roles-enfermera.jpg', '/lib/roles-azafata.jpg', '/lib/roles-profesora.jpg'] },
  { g: 'fantasia', icon: 'Ghost', name: 'Kostüme', scenes: ['Halloween', 'Cosplay', 'Mottoparty', 'Lieblingscharakter'], imgs: ['/lib/disfraces-halloween.jpg', '/lib/disfraces-cosplay.jpg', '/lib/disfraces-fiesta.jpg', '/lib/disfraces-personaje.jpg'] },
  { g: 'fantasia', icon: 'Film', name: 'Kino-Roleplay', scenes: ['Filmszene', 'Geheimnisvoller Charakter', 'Geschichte in Kapiteln', 'Alternatives Ende'], imgs: ['/lib/cine-escena.jpg', '/lib/cine-misterioso.jpg', '/lib/cine-capitulos.jpg', '/lib/cine-final.jpg'] },
  { g: 'fantasia', icon: 'Gamepad2', name: 'Gamer', scenes: ['Nachts zocken', 'Gamer-Setup', 'Ich habe die Wette verloren', 'Wir zocken zusammen'], imgs: ['/lib/gamer-noche.jpg', '/lib/gamer-setup.jpg', '/lib/gamer-apuesta.jpg', '/lib/gamer-juntos.jpg'] },
  { g: 'fantasia', icon: 'GraduationCap', name: 'Uni', scenes: ['Spät noch lernen', 'Uniform', 'In der Bibliothek', 'Prüfung bestanden'], imgs: ['/lib/universidad-estudiando.jpg', '/lib/universidad-uniforme.jpg', '/lib/universidad-biblioteca.jpg', '/lib/universidad-examen.jpg'] },
  { g: 'fantasia', icon: 'Route', name: 'Motorrad & Abenteuer', scenes: ['Auf dem Motorrad', 'Helm und Leder', 'Offene Straße', 'Kurztrip'], imgs: ['/lib/moto-enlamoto.jpg', '/lib/moto-casco.jpg', '/lib/moto-carretera.jpg', '/lib/moto-escapada.jpg'] },
  { g: 'fantasia', icon: 'Dices', name: 'Du entscheidest', scenes: ['Wähl mein Outfit', 'Wahrheit oder Pflicht', 'Glücksrad', 'Heute hast du das Sagen'], imgs: ['/lib/tudecides-outfit.jpg', '/lib/tudecides-verdad.jpg', '/lib/tudecides-rueda.jpg', '/lib/tudecides-mandas.jpg'] },
  { g: 'fantasia', icon: 'Target', name: 'Individuelle Wünsche', scenes: ['Dein Spezialwunsch', 'Nur für dich gemacht', 'Was du dir gewünscht hast', 'Exklusives Custom'], imgs: ['/lib/pedidos-especial.jpg', '/lib/pedidos-parati.jpg', '/lib/pedidos-loquepediste.jpg', '/lib/pedidos-custom.jpg'] },
  { g: 'fantasia', icon: 'Music', name: 'Musik & Tanz', scenes: ['Singen im Auto', 'Tanzen zu Hause', 'Mit Kopfhörern', 'Playlist für dich'], imgs: ['/lib/musica-carro.jpg', '/lib/musica-baile.jpg', '/lib/musica-audifonos.jpg', '/lib/musica-playlist.jpg'] },

  // ── Verkauf & Dringlichkeit ──
  { g: 'venta', icon: 'Timer', name: 'Angebote & Dringlichkeit', scenes: ['Mitternachts-Drop', 'Nur heute', 'Letzte Stunden', 'Überraschungsrabatt'], imgs: ['/lib/venta-drop-medianoche.jpg', '/lib/venta-solo-hoy.jpg', '/lib/venta-ultimas-horas.jpg', '/lib/venta-descuento-sorpresa.jpg'] },
  { g: 'venta', icon: 'Lock', name: 'Nur für dich (VIP)', scenes: ['Das kommt nicht in meinen Feed', 'Ein Geheimnis unter uns', 'Personalisiertes Geschenk', 'Dein Name auf meiner Haut'], imgs: ['/lib/venta-nofeed.jpg', '/lib/venta-secreto.jpg', '/lib/venta-regalo.jpg', '/lib/venta-nombre-piel.jpg'] },
  { g: 'venta', icon: 'Trophy', name: 'Ziele & Challenges', scenes: ['Tip-Ziel', 'Challenge der Woche', 'Wenn wir es schaffen…', 'Belohnung freigeschaltet'], imgs: ['/lib/venta-meta-tips.jpg', '/lib/venta-reto-semana.jpg', '/lib/venta-si-llegamos.jpg', '/lib/venta-recompensa.jpg'] },
  { g: 'venta', icon: 'Flame', name: 'Teasing', scenes: ['Neue Dessous', 'Rate mal, was ich trage', 'Outfit-Wechsel', 'Unter dem Kleid'], imgs: ['/lib/venta-nueva-lenceria.jpg', '/lib/venta-adivina.jpg', '/lib/venta-cambio-outfit.jpg', '/lib/venta-debajo-vestido.jpg'] },
  { g: 'venta', icon: 'Package', name: 'Packs & Bundles', scenes: ['Pack des Monats', 'Spezial-Combo', 'Komplette Kollektion', 'Das meistgefragte'], imgs: ['/lib/venta-pack-mes.jpg', '/lib/venta-combo.jpg', '/lib/venta-coleccion.jpg', '/lib/venta-mas-pedido.jpg'] },
  { g: 'venta', icon: 'BellRing', name: 'Rückgewinnung', scenes: ['Du bist gegangen, ohne tschüss zu sagen', 'Du bist zurück, ich habe dich vermisst', 'Comeback-Angebot', 'Bist du noch da?'], imgs: ['/lib/venta-fuiste.jpg', '/lib/venta-volviste.jpg', '/lib/venta-oferta-regreso.jpg', '/lib/venta-sigues-ahi.jpg'] },
  { g: 'venta', icon: 'Eye', name: 'Vorschauen', scenes: ['Sneak Peek', 'Nur ein kleines Stückchen', 'Was als Nächstes kommt', 'Vorerst zensiert'], imgs: ['/lib/venta-sneak-peek.jpg', '/lib/venta-pedacito.jpg', '/lib/venta-loquevendra.jpg', '/lib/venta-censurado.jpg'] },
  { g: 'venta', icon: 'BarChart3', name: 'Umfragen', scenes: ['Welches gefällt dir besser?', 'Stimm über das nächste Set ab', 'A oder B', 'Heiße Umfrage'], imgs: ['/lib/venta-cual-prefieres.jpg', '/lib/venta-vota-set.jpg', '/lib/venta-ab.jpg', '/lib/venta-encuesta-picante.jpg'] },
  { g: 'venta', icon: 'MessageCircle', name: 'Chat-Opener', scenes: ['Das Eis brechen', 'Ich hab was für dich', 'Rate mal, was ich heute gemacht habe', 'Ich habe an dich gedacht'], imgs: ['/lib/venta-hielo.jpg', '/lib/venta-tengo-algo.jpg', '/lib/venta-adivina-hoy.jpg', '/lib/venta-pense-en-ti.jpg'] },
  { g: 'venta', icon: 'Ticket', name: 'Limitierter Zugang', scenes: ['Nur 10 Personen', 'Private Einladung', 'VIP-Liste', 'Wird in 24 h gelöscht'], imgs: ['/lib/venta-solo10.jpg', '/lib/venta-invitacion.jpg', '/lib/venta-vip.jpg', '/lib/venta-borra24h.jpg'] },

  // ── Premium-Lifestyle ──
  { g: 'premium', icon: 'Plane', name: 'Reisen', scenes: ['Auf dem Weg zum Flughafen', 'Im Flugzeug', 'Ankunft im Hotel', 'Die Stadt erkunden'], imgs: ['/lib/viajes-aeropuerto.jpg', '/lib/viajes-avion.jpg', '/lib/viajes-hotel.jpg', '/lib/viajes-ciudad.jpg'] },
  { g: 'premium', icon: 'Hotel', name: 'Resort & Urlaub', scenes: ['Check-in im Resort', 'Hütte direkt am Meer', 'Sonnenuntergang am Strand', 'Piña Colada'], imgs: ['/lib/resort-checkin.jpg', '/lib/resort-cabana.jpg', '/lib/resort-atardecer.jpg', '/lib/resort-pinacolada.jpg'] },
  { g: 'premium', icon: 'Sun', name: 'Strand & Pool', scenes: ['Pooltag', 'Strandtag', 'Beim Sonnenbaden', 'Nass vom Meer'], imgs: ['/lib/playa-piscina.jpg', '/lib/playa-playa.jpg', '/lib/playa-bronceando.jpg', '/lib/playa-mojada.jpg'] },
  { g: 'premium', icon: 'Bath', name: 'Jacuzzi & Spa', scenes: ['Jacuzzi bei Nacht', 'Private Sauna', 'Schaumbad', 'Spa-Tag'], imgs: ['/lib/spa-jacuzzi-noche.jpg', '/lib/spa-sauna-privada.jpg', '/lib/spa-burbujas.jpg', '/lib/spa-dia.jpg'] },
  { g: 'premium', icon: 'Droplets', name: 'Dusche', scenes: ['Vor der Dusche', 'Dampf auf dem Spiegel', 'Nur ein Handtuch', 'Nasse Haare'], imgs: ['/lib/ducha-antes.jpg', '/lib/ducha-vapor.jpg', '/lib/ducha-toalla.jpg', '/lib/ducha-pelo.jpg'] },
  { g: 'premium', icon: 'Gem', name: 'Luxus', scenes: ['Luxushotel', 'Schmuck', 'Sportwagen', 'Champagner'], imgs: ['/lib/lujo-hotel.jpg', '/lib/lujo-joyas.jpg', '/lib/lujo-auto.jpg', '/lib/lujo-champana.jpg'] },
  { g: 'premium', icon: 'Building2', name: 'Stadt bei Nacht', scenes: ['Lichter der Stadt', 'Rooftop', 'Nächtliche Taxifahrt', 'Schaufenster bei Nacht'], imgs: ['/lib/ciudad-luces.jpg', '/lib/ciudad-rooftop.jpg', '/lib/ciudad-taxi.jpg', '/lib/ciudad-vitrinas.jpg'] },
  { g: 'premium', icon: 'Martini', name: 'Bar & Cocktails', scenes: ['Cocktail an der Bar', 'Anstoßen', 'Barabend', 'Wein zu Hause'], imgs: ['/lib/bar-coctel.jpg', '/lib/bar-brindis.jpg', '/lib/bar-noche.jpg', '/lib/bar-vino.jpg'] },
  { g: 'premium', icon: 'Users', name: 'Social Life', scenes: ['Vor dem Ausgehen', 'Auf einer Party', 'Nach der Party', 'Mit meinen Mädels'], imgs: ['/lib/social-antes.jpg', '/lib/social-fiesta.jpg', '/lib/social-despues.jpg', '/lib/social-amigas.jpg'] },
  { g: 'premium', icon: 'Flower2', name: 'Yoga & Wellness', scenes: ['Yogastunde', 'Stretching zu Hause', 'Beim Meditieren', 'Neues Sportoutfit'], imgs: ['/lib/yoga-clase.jpg', '/lib/yoga-estirando.jpg', '/lib/yoga-meditando.jpg', '/lib/yoga-ropa.jpg'] },
];

// ── Audio: noch nicht im Angebot. Separat gehalten, klar als „bald verfügbar" markiert. ──
export const AUDIO_DE = {
  title: 'Audio',
  badge: 'Bald verfügbar',
  intro: 'Das bieten wir noch nicht an — aktuell produzieren wir nur Foto und Video. Aber das kommt bald, und es fesselt richtig:',
  ideas: [
    { icon: 'Mic', name: 'Persönliche Sprachnachricht', scenes: ['Guten Morgen mit deinem Namen', 'Ich erzähle dir von meinem Tag', 'Vor dem Schlafen'] },
    { icon: 'AudioLines', name: 'Flüstern / ASMR', scenes: ['Ein Flüstern ins Ohr', 'Zum Entspannen', 'Zum gemeinsamen Einschlafen'] },
    { icon: 'Headphones', name: 'Fantasie-Audio', scenes: ['Erzählte Geschichte', 'Roleplay als Audio', 'Eine Szene nur für dich'] },
    { icon: 'Volume2', name: 'Reaktionen', scenes: ['Aufgenommenes Lachen', 'Reaktion auf dein Geschenk', 'Danke als Audio'] },
  ],
};
