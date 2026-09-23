-- Motor real usado para crear cada foto (se muestra debajo de la foto). El worker lo reporta al terminar.
alter table generations add column if not exists engine_label text;
