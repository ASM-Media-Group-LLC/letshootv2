-- Nuevo rol Finanzas (solo números). chatter y producer ya existen en el enum (producer = Editor/QA).
alter type user_role add value if not exists 'finance';
