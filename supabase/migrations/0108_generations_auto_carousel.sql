-- Carrusel al cocinar (/kitchen): si una réplica se manda con auto_carousel>0, cuando
-- termina de cocinarse el worker/edge encola auto_carousel variaciones (misma escena, otras poses).
alter table generations add column if not exists auto_carousel int not null default 0;
