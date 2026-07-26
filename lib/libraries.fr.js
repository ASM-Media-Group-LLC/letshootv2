// 50 STRATÉGIES de contenu pour l'engagement + les ventes sur OnlyFans.
// Chaque stratégie = un ensemble de scènes qui racontent une histoire et se terminent par une vente.
// `icon` = nom d'icône lucide-react (mappé dans la page). Pas d'emojis : icônes vectorielles uniquement.

export const GROUPS_FR = [
  { id: 'dia', name: 'Ton quotidien' },
  { id: 'enganche', name: 'Engagement & GFE' },
  { id: 'fantasia', name: 'Fantasme & roleplay' },
  { id: 'venta', name: 'Vente & urgence' },
  { id: 'premium', name: 'Lifestyle premium' },
];

export const LIBRARIES_FR = [
  // ── Ton quotidien ──
  { g: 'dia', icon: 'Dumbbell', name: 'Salle de sport', scenes: ['En route vers la salle', 'À l’entraînement', 'Pause entre les séries', 'Après l’entraînement'], imgs: ['/lib/gimnasio-camino.jpg', '/lib/gimnasio-entrenando.jpg', '/lib/gimnasio-descansando.jpg', '/lib/gimnasio-post-entreno.jpg'] },
  { g: 'dia', icon: 'UtensilsCrossed', name: 'Nourriture', scenes: ['Je prépare le petit-déj', 'En cuisine', 'Au dîner', 'Je commande à manger'], imgs: ['/lib/comida-desayuno.jpg', '/lib/comida-cocinando.jpg', '/lib/comida-cenando.jpg', '/lib/comida-pidiendo.jpg'] },
  { g: 'dia', icon: 'ShoppingBag', name: 'Shopping', scenes: ['Shopping de vêtements', 'Shopping de lingerie', 'Au supermarché', 'Achat de maquillage'], imgs: ['/lib/compras-ropa.jpg', '/lib/compras-lenceria.jpg', '/lib/compras-super.jpg', '/lib/compras-maquillaje.jpg'] },
  { g: 'dia', icon: 'Brush', name: 'Beauté', scenes: ['Je me fais les ongles', 'Au salon', 'Je me maquille', 'Routine skincare'], imgs: ['/lib/belleza-unas.jpg', '/lib/belleza-salon.jpg', '/lib/belleza-maquillaje.jpg', '/lib/belleza-skincare.jpg'] },
  { g: 'dia', icon: 'Car', name: 'Transport', scenes: ['En voiture', 'En Uber', 'Dans les bouchons', 'À la recherche d’une place'], imgs: ['/lib/transporte-carro.jpg', '/lib/transporte-uber.jpg', '/lib/transporte-trafico.jpg', '/lib/transporte-parqueo.jpg'] },
  { g: 'dia', icon: 'Home', name: 'Maison', scenes: ['Je viens de me réveiller', 'Ménage', 'Je range ma chambre', 'Devant un film'], imgs: ['/lib/casa-despertando.jpg', '/lib/casa-limpiando.jpg', '/lib/casa-organizando.jpg', '/lib/casa-pelicula.jpg'] },
  { g: 'dia', icon: 'Briefcase', name: 'Travail', scenes: ['Je réponds aux messages', 'Je tourne du contenu', 'Séance photo', 'Je planifie ma semaine'], imgs: ['/lib/trabajo-mensajes.jpg', '/lib/trabajo-grabando.jpg', '/lib/trabajo-sesion.jpg', '/lib/trabajo-planeando.jpg'] },
  { g: 'dia', icon: 'PawPrint', name: 'Animaux', scenes: ['Balade avec mon chien', 'Je joue avec mon chat', 'Chez le véto', 'Canapé avec mon animal'], imgs: ['/lib/mascotas-perro.jpg', '/lib/mascotas-gato.jpg', '/lib/mascotas-veterinario.jpg', '/lib/mascotas-sofa.jpg'] },
  { g: 'dia', icon: 'CloudRain', name: 'Jour de pluie', scenes: ['Pluie et plaid', 'Café et hoodie', 'Film au lit', 'Fenêtre embuée'], imgs: ['/lib/lluvia-manta.jpg', '/lib/lluvia-cafe.jpg', '/lib/lluvia-peli.jpg', '/lib/lluvia-ventana.jpg'] },
  { g: 'dia', icon: 'CalendarDays', name: 'Routine de la semaine', scenes: ['Lundi tranquille', 'Milieu de semaine', 'Vendredi soir de sortie', 'Dimanche en pyjama'], imgs: ['/lib/rutina-lunes.jpg', '/lib/rutina-semana.jpg', '/lib/rutina-viernes.jpg', '/lib/rutina-domingo.jpg'] },

  // ── Engagement & GFE ──
  { g: 'enganche', icon: 'Heart', name: 'Petite amie virtuelle (GFE)', scenes: ['Bonjour depuis le lit', 'Avant de dormir', 'Tu m’as manqué aujourd’hui', 'J’aimerais que tu sois là'], imgs: ['/lib/gfe-buenosdias.jpg', '/lib/gfe-dormir.jpg', '/lib/gfe-extrane.jpg', '/lib/gfe-aqui.jpg'] },
  { g: 'enganche', icon: 'Smile', name: 'Émotions', scenes: ['Aujourd’hui je suis heureuse', 'J’ai eu une journée difficile', 'Je me sens seule', 'Je suis excitée par quelque chose'], imgs: ['/lib/emociones-feliz.jpg', '/lib/emociones-dificil.jpg', '/lib/emociones-sola.jpg', '/lib/emociones-emocionada.jpg'] },
  { g: 'enganche', icon: 'Moon', name: 'Nuit blanche', scenes: ['Je n’arrive pas à dormir', 'Message de 2 h du matin', 'Reste éveillé avec moi', 'Insomnie avec toi'], imgs: ['/lib/madrugada-nodormir.jpg', '/lib/madrugada-2am.jpg', '/lib/madrugada-despierta.jpg', '/lib/madrugada-insomnio.jpg'] },
  { g: 'enganche', icon: 'PartyPopper', name: 'Nos moments à deux', scenes: ['1 mois ensemble', 'Anniversaire d’abonnement', 'Merci d’être là', 'Notre souvenir'], imgs: ['/lib/hitos-1mes.jpg', '/lib/hitos-aniversario.jpg', '/lib/hitos-gracias.jpg', '/lib/hitos-recuerdo.jpg'] },
  { g: 'enganche', icon: 'Quote', name: 'Confessions', scenes: ['Je te raconte un secret', 'Je ne l’ai jamais dit à personne', 'Mon fantasme', 'Demande-moi ce que tu veux'], imgs: ['/lib/confesiones-secreto.jpg', '/lib/confesiones-nunca-dicho.jpg', '/lib/confesiones-fantasia.jpg', '/lib/confesiones-preguntame.jpg'] },
  { g: 'enganche', icon: 'Sparkles', name: 'Flirt', scenes: ['Je me mords la lèvre', 'Un clin d’œil pour toi', 'Je danse pour toi', 'Selfie devant le miroir'], imgs: ['/lib/coqueteo-labio.jpg', '/lib/coqueteo-guino.jpg', '/lib/coqueteo-bailando.jpg', '/lib/coqueteo-espejo.jpg'] },
  { g: 'enganche', icon: 'BedDouble', name: 'Se réveiller ensemble', scenes: ['Draps froissés', 'Petit-déj au lit', 'Bonjour paresseux', 'Câlin d’oreiller'], imgs: ['/lib/despertar-sabanas.jpg', '/lib/despertar-desayuno.jpg', '/lib/despertar-perezoso.jpg', '/lib/despertar-almohada.jpg'] },
  { g: 'enganche', icon: 'HeartHandshake', name: 'Fantasme de couple', scenes: ['Ta copine', 'Dîner romantique à la maison', 'Notre routine', 'Des projets ensemble'], imgs: ['/lib/pareja-novia.jpg', '/lib/pareja-cena.jpg', '/lib/pareja-rutina.jpg', '/lib/pareja-planes.jpg'] },
  { g: 'enganche', icon: 'Clapperboard', name: 'Coulisses', scenes: ['Avant la photo', 'Bêtisier', 'Le making-of', 'Sur le plateau'], imgs: ['/lib/bts-antes.jpg', '/lib/bts-bloopers.jpg', '/lib/bts-como.jpg', '/lib/bts-set.jpg'] },
  { g: 'enganche', icon: 'Gift', name: 'Cadeaux & wishlist', scenes: ['J’ouvre ton cadeau', 'Ma wishlist', 'Merci pour l’attention', 'Je porte ce que tu m’as offert'], imgs: ['/lib/regalos-abriendo.jpg', '/lib/regalos-wishlist.jpg', '/lib/regalos-gracias.jpg', '/lib/regalos-usando.jpg'] },

  // ── Fantasme & roleplay ──
  { g: 'fantasia', icon: 'Drama', name: 'POV / Fantasme', scenes: ['POV : tu rentres à la maison', 'POV : premier rendez-vous', 'POV : je t’ai réveillé', 'Ta voisine coquine'], imgs: ['/lib/pov-casa.jpg', '/lib/pov-cita.jpg', '/lib/pov-desperte.jpg', '/lib/pov-vecina.jpg'] },
  { g: 'fantasia', icon: 'Shirt', name: 'Rôles professionnels', scenes: ['Employée de bureau', 'Infirmière', 'Hôtesse de l’air', 'Professeure'], imgs: ['/lib/roles-oficinista.jpg', '/lib/roles-enfermera.jpg', '/lib/roles-azafata.jpg', '/lib/roles-profesora.jpg'] },
  { g: 'fantasia', icon: 'Ghost', name: 'Déguisements', scenes: ['Halloween', 'Cosplay', 'Soirée à thème', 'Personnage préféré'], imgs: ['/lib/disfraces-halloween.jpg', '/lib/disfraces-cosplay.jpg', '/lib/disfraces-fiesta.jpg', '/lib/disfraces-personaje.jpg'] },
  { g: 'fantasia', icon: 'Film', name: 'Roleplay cinématographique', scenes: ['Scène de film', 'Personnage mystérieux', 'Histoire en chapitres', 'Fin alternative'], imgs: ['/lib/cine-escena.jpg', '/lib/cine-misterioso.jpg', '/lib/cine-capitulos.jpg', '/lib/cine-final.jpg'] },
  { g: 'fantasia', icon: 'Gamepad2', name: 'Gameuse', scenes: ['Je joue la nuit', 'Setup gamer', 'J’ai perdu le pari', 'On joue ensemble'], imgs: ['/lib/gamer-noche.jpg', '/lib/gamer-setup.jpg', '/lib/gamer-apuesta.jpg', '/lib/gamer-juntos.jpg'] },
  { g: 'fantasia', icon: 'GraduationCap', name: 'Université', scenes: ['Je révise tard', 'Uniforme', 'À la bibliothèque', 'Examen réussi'], imgs: ['/lib/universidad-estudiando.jpg', '/lib/universidad-uniforme.jpg', '/lib/universidad-biblioteca.jpg', '/lib/universidad-examen.jpg'] },
  { g: 'fantasia', icon: 'Route', name: 'Moto & aventure', scenes: ['Sur la moto', 'Casque et cuir', 'Route ouverte', 'Escapade'], imgs: ['/lib/moto-enlamoto.jpg', '/lib/moto-casco.jpg', '/lib/moto-carretera.jpg', '/lib/moto-escapada.jpg'] },
  { g: 'fantasia', icon: 'Dices', name: 'C’est toi qui décides', scenes: ['Choisis ma tenue', 'Action ou vérité', 'Roue de la chance', 'C’est toi le chef aujourd’hui'], imgs: ['/lib/tudecides-outfit.jpg', '/lib/tudecides-verdad.jpg', '/lib/tudecides-rueda.jpg', '/lib/tudecides-mandas.jpg'] },
  { g: 'fantasia', icon: 'Target', name: 'Demandes personnalisées', scenes: ['Ta demande spéciale', 'Fait rien que pour toi', 'Ce que tu m’as demandé', 'Custom exclusif'], imgs: ['/lib/pedidos-especial.jpg', '/lib/pedidos-parati.jpg', '/lib/pedidos-loquepediste.jpg', '/lib/pedidos-custom.jpg'] },
  { g: 'fantasia', icon: 'Music', name: 'Musique & danse', scenes: ['Je chante en voiture', 'Je danse à la maison', 'Avec mes écouteurs', 'Playlist pour toi'], imgs: ['/lib/musica-carro.jpg', '/lib/musica-baile.jpg', '/lib/musica-audifonos.jpg', '/lib/musica-playlist.jpg'] },

  // ── Vente & urgence ──
  { g: 'venta', icon: 'Timer', name: 'Offres et urgence', scenes: ['Drop de minuit', 'Aujourd’hui seulement', 'Dernières heures', 'Réduction surprise'], imgs: ['/lib/venta-drop-medianoche.jpg', '/lib/venta-solo-hoy.jpg', '/lib/venta-ultimas-horas.jpg', '/lib/venta-descuento-sorpresa.jpg'] },
  { g: 'venta', icon: 'Lock', name: 'Rien que pour toi (VIP)', scenes: ['Ça n’ira pas sur mon feed', 'Un secret entre nous deux', 'Cadeau personnalisé', 'Ton prénom sur ma peau'], imgs: ['/lib/venta-nofeed.jpg', '/lib/venta-secreto.jpg', '/lib/venta-regalo.jpg', '/lib/venta-nombre-piel.jpg'] },
  { g: 'venta', icon: 'Trophy', name: 'Objectifs & défis', scenes: ['Objectif de tips', 'Défi de la semaine', 'Si on atteint…', 'Récompense débloquée'], imgs: ['/lib/venta-meta-tips.jpg', '/lib/venta-reto-semana.jpg', '/lib/venta-si-llegamos.jpg', '/lib/venta-recompensa.jpg'] },
  { g: 'venta', icon: 'Flame', name: 'Provocation', scenes: ['Nouvelle lingerie', 'Devine ce que je porte', 'Changement de tenue', 'Sous la robe'], imgs: ['/lib/venta-nueva-lenceria.jpg', '/lib/venta-adivina.jpg', '/lib/venta-cambio-outfit.jpg', '/lib/venta-debajo-vestido.jpg'] },
  { g: 'venta', icon: 'Package', name: 'Packs & bundles', scenes: ['Pack du mois', 'Combo spécial', 'Collection complète', 'Le plus demandé'], imgs: ['/lib/venta-pack-mes.jpg', '/lib/venta-combo.jpg', '/lib/venta-coleccion.jpg', '/lib/venta-mas-pedido.jpg'] },
  { g: 'venta', icon: 'BellRing', name: 'Réactivation', scenes: ['Tu es parti sans dire au revoir', 'Tu es revenu, tu m’as manqué', 'Offre de retour', 'Tu es toujours là ?'], imgs: ['/lib/venta-fuiste.jpg', '/lib/venta-volviste.jpg', '/lib/venta-oferta-regreso.jpg', '/lib/venta-sigues-ahi.jpg'] },
  { g: 'venta', icon: 'Eye', name: 'Avant-goûts', scenes: ['Sneak peek', 'Juste un petit bout', 'Ce qui arrive', 'Censuré pour l’instant'], imgs: ['/lib/venta-sneak-peek.jpg', '/lib/venta-pedacito.jpg', '/lib/venta-loquevendra.jpg', '/lib/venta-censurado.jpg'] },
  { g: 'venta', icon: 'BarChart3', name: 'Sondages', scenes: ['Lequel tu préfères ?', 'Vote pour le prochain set', 'A ou B', 'Sondage coquin'], imgs: ['/lib/venta-cual-prefieres.jpg', '/lib/venta-vota-set.jpg', '/lib/venta-ab.jpg', '/lib/venta-encuesta-picante.jpg'] },
  { g: 'venta', icon: 'MessageCircle', name: 'Openers de chat', scenes: ['Je brise la glace', 'J’ai quelque chose pour toi', 'Devine ce que j’ai fait aujourd’hui', 'J’ai pensé à toi'], imgs: ['/lib/venta-hielo.jpg', '/lib/venta-tengo-algo.jpg', '/lib/venta-adivina-hoy.jpg', '/lib/venta-pense-en-ti.jpg'] },
  { g: 'venta', icon: 'Ticket', name: 'Accès limité', scenes: ['Seulement 10 personnes', 'Invitation privée', 'Liste VIP', 'Supprimé dans 24 h'], imgs: ['/lib/venta-solo10.jpg', '/lib/venta-invitacion.jpg', '/lib/venta-vip.jpg', '/lib/venta-borra24h.jpg'] },

  // ── Lifestyle premium ──
  { g: 'premium', icon: 'Plane', name: 'Voyages', scenes: ['En route vers l’aéroport', 'Dans l’avion', 'Arrivée à l’hôtel', 'À la découverte de la ville'], imgs: ['/lib/viajes-aeropuerto.jpg', '/lib/viajes-avion.jpg', '/lib/viajes-hotel.jpg', '/lib/viajes-ciudad.jpg'] },
  { g: 'premium', icon: 'Hotel', name: 'Resort & vacances', scenes: ['Check-in au resort', 'Cabane face à la mer', 'Coucher de soleil sur la plage', 'Piña colada'], imgs: ['/lib/resort-checkin.jpg', '/lib/resort-cabana.jpg', '/lib/resort-atardecer.jpg', '/lib/resort-pinacolada.jpg'] },
  { g: 'premium', icon: 'Sun', name: 'Plage & piscine', scenes: ['Journée piscine', 'Journée plage', 'Séance bronzage', 'Mouillée en sortant de la mer'], imgs: ['/lib/playa-piscina.jpg', '/lib/playa-playa.jpg', '/lib/playa-bronceando.jpg', '/lib/playa-mojada.jpg'] },
  { g: 'premium', icon: 'Bath', name: 'Jacuzzi & spa', scenes: ['Jacuzzi de nuit', 'Sauna privé', 'Bain moussant', 'Journée spa'], imgs: ['/lib/spa-jacuzzi-noche.jpg', '/lib/spa-sauna-privada.jpg', '/lib/spa-burbujas.jpg', '/lib/spa-dia.jpg'] },
  { g: 'premium', icon: 'Droplets', name: 'Douche', scenes: ['Avant la douche', 'Buée sur le miroir', 'Juste une serviette', 'Cheveux mouillés'], imgs: ['/lib/ducha-antes.jpg', '/lib/ducha-vapor.jpg', '/lib/ducha-toalla.jpg', '/lib/ducha-pelo.jpg'] },
  { g: 'premium', icon: 'Gem', name: 'Luxe', scenes: ['Hôtel de luxe', 'Bijoux', 'Voiture de sport', 'Champagne'], imgs: ['/lib/lujo-hotel.jpg', '/lib/lujo-joyas.jpg', '/lib/lujo-auto.jpg', '/lib/lujo-champana.jpg'] },
  { g: 'premium', icon: 'Building2', name: 'Ville de nuit', scenes: ['Lumières de la ville', 'Rooftop', 'Taxi de nuit', 'Vitrines de nuit'], imgs: ['/lib/ciudad-luces.jpg', '/lib/ciudad-rooftop.jpg', '/lib/ciudad-taxi.jpg', '/lib/ciudad-vitrinas.jpg'] },
  { g: 'premium', icon: 'Martini', name: 'Bar & cocktails', scenes: ['Cocktail au bar', 'Un toast', 'Soirée bar', 'Vin à la maison'], imgs: ['/lib/bar-coctel.jpg', '/lib/bar-brindis.jpg', '/lib/bar-noche.jpg', '/lib/bar-vino.jpg'] },
  { g: 'premium', icon: 'Users', name: 'Vie sociale', scenes: ['Avant de sortir', 'En soirée', 'Après la fête', 'Avec mes copines'], imgs: ['/lib/social-antes.jpg', '/lib/social-fiesta.jpg', '/lib/social-despues.jpg', '/lib/social-amigas.jpg'] },
  { g: 'premium', icon: 'Flower2', name: 'Yoga & wellness', scenes: ['Cours de yoga', 'Étirements à la maison', 'Méditation', 'Nouvelle tenue de sport'], imgs: ['/lib/yoga-clase.jpg', '/lib/yoga-estirando.jpg', '/lib/yoga-meditando.jpg', '/lib/yoga-ropa.jpg'] },
];

// ── Audio : pas encore proposé. Gardé à part, clairement marqué comme à venir. ──
export const AUDIO_FR = {
  title: 'Audio',
  badge: 'Bientôt disponible',
  intro: 'On ne le propose pas encore — aujourd’hui on produit uniquement photo et vidéo. Mais voilà ce qui arrive, et ça accroche énormément :',
  ideas: [
    { icon: 'Mic', name: 'Note vocale personnelle', scenes: ['Bonjour avec ton prénom', 'Je te raconte ma journée', 'Avant de dormir'] },
    { icon: 'AudioLines', name: 'Chuchotements / ASMR', scenes: ['Un murmure à l’oreille', 'Pour te détendre', 'Pour s’endormir ensemble'] },
    { icon: 'Headphones', name: 'Audio de fantasme', scenes: ['Histoire racontée', 'Roleplay en audio', 'Une scène rien que pour toi'] },
    { icon: 'Volume2', name: 'Réactions', scenes: ['Rire enregistré', 'Réaction à ton cadeau', 'Merci en audio'] },
  ],
};
