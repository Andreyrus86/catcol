<?php
// Подключение к базе данных
$dbHost = 'localhost';
$dbPort = '5432';
$dbName = 'nftcats';
$dbUser = 'postgres';
$dbPass = 'postgres';

$dsn = "pgsql:host=$dbHost;port=$dbPort;dbname=$dbName";
try {
    $pdo = new PDO($dsn, $dbUser, $dbPass);
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
    exit();
}

// Получаем данные из таблицы
$query = "SELECT id, title, number FROM collectibles ORDER BY number";
$stmt = $pdo->query($query);

while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $id = $row['id'];
    $title = $row['title'];
    $number = str_pad($row['number'], 2, '0', STR_PAD_LEFT); // форматируем номер как 01, 02 и т.д.

    // Шаблон пути для новых папок
    $folderPath = "../media/book_1/$id";
    if (!file_exists($folderPath)) {
        mkdir($folderPath, 0777, true);
    }

    // Поиск соответствующего изображения
    $imagePath = "../media/assets/$number.png";
    if (file_exists($imagePath)) {
        // Копируем изображение в новую папку с переименованием
        $newImagePath = "$folderPath/card.png";
        copy($imagePath, $newImagePath);

        // Создаем превью изображения с шириной 400px
        $image = imagecreatefrompng($newImagePath);
        $width = imagesx($image);
        $height = imagesy($image);

        $newWidth = 400;
        $newHeight = (int)(($newWidth / $width) * $height);

        $previewImage = imagecreatetruecolor($newWidth, $newHeight);
        imagecopyresampled($previewImage, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);

        // Сохраняем превью рядом с оригиналом
        $previewImagePath = "$folderPath/card_preview.png";
        imagepng($previewImage, $previewImagePath);

        // Освобождаем память
        imagedestroy($image);
        imagedestroy($previewImage);
    } else {
        echo "Image $number.png not found.\n";
    }
}

echo "Process completed successfully.\n";
?>
