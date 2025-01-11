<?php
// Настройки подключения к базе данных
$dbHost = 'localhost';
$dbName = 'nftcats';
$dbUser = 'postgres';
$dbPassword = 'postgres';

try {
    // Подключение к PostgreSQL
    $pdo = new PDO("pgsql:host=$dbHost;dbname=$dbName", $dbUser, $dbPassword);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("Ошибка подключения к базе данных: " . $e->getMessage());
}

// Базовый путь к папке "media"
$basePath = __DIR__ . '/../media/book_1';

// Рекурсивный поиск файлов card_preview.png
function findCardPreviews($dir)
{
    $files = [];
    $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir));

    foreach ($iterator as $file) {
        if ($file->isFile() && $file->getFilename() === 'card_preview.png') {
            $files[] = $file->getPathname();
        }
    }

    return $files;
}

// Получаем список всех файлов card_preview.png
$cardFiles = findCardPreviews($basePath);

// Обработка каждого файла
foreach ($cardFiles as $filePath) {
    // Извлечение UUID из пути
    $parts = explode(DIRECTORY_SEPARATOR, $filePath);

    $uuidIndex = array_search('media', $parts) + 2; // Индекс UUID (media/book_1/UUID/...)
    $uuid = $parts[$uuidIndex] ?? null;

    if (!$uuid) {
        echo "Не удалось извлечь UUID для файла: $filePath\n";
        continue;
    }

    // Получение base64-кодировки изображения
    $imageData = file_get_contents($filePath);
    if ($imageData === false) {
        echo "Не удалось прочитать файл: $filePath\n";
        continue;
    }

    $base64Image = base64_encode($imageData);

    // Обновление базы данных
    $sql = "UPDATE collectibles SET card_image = :card_image WHERE id = :id";

    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute([':card_image' => $base64Image, ':id' => $uuid]);
        echo "Успешно обновлено для UUID: $uuid\n";
    } catch (PDOException $e) {
        echo "Ошибка обновления базы данных для UUID $uuid: " . $e->getMessage() . "\n";
    }
}

echo "Обработка завершена.\n";
