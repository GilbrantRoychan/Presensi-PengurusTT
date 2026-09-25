-- Menambahkan kolom status_dapukan bertipe array text (nullable) ke tabel pengurus
ALTER TABLE pengurus 
ADD COLUMN IF NOT EXISTS status_dapukan TEXT[];