-- Mesaj tiplerini barındıran message_type_enum'a 'template' türü ekleniyor.
ALTER TYPE message_type_enum ADD VALUE IF NOT EXISTS 'template';
