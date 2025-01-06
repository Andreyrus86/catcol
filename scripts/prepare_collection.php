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

// Директории
$assetsDir = "../media/assets/";
$finalDir = "../media/assets_final/";

// Создаем директорию для финальных файлов, если её нет
if (!file_exists($finalDir)) {
    mkdir($finalDir, 0777, true);
}

// Получаем данные из таблицы
$query = "SELECT id, title, number, short_description FROM collectibles";
$stmt = $pdo->query($query);

while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $id = $row['id'];
    $title = $row['title'];
    $number = $row['number'];
    $shortDescription = $row['short_description'] ?? '';

    $imagePath = $assetsDir . $number . ".png";
    if (file_exists($imagePath)) {
        // Создаем 100 копий изображения
        for ($i = 1; $i <= 100; $i++) {
            $newNumber = (($number - 1) * 100) + $i;
            $newFileName = "$newNumber.png";
            $newImagePath = $finalDir . $newFileName;

            // Копируем файл
            copy($imagePath, $newImagePath);

            // Создаем JSON-файл
            $jsonFileName = "$newNumber.json";
            $jsonFilePath = $finalDir . $jsonFileName;

            $jsonData = [
                "name" => $title,
                "symbol" => "NFTCATS",
                "image" => $newFileName,
                "properties" => [
                    "files" => [
                        ["uri" => $newFileName, "type" => "image/png"]
                    ],
                    "category" => "image"
                ],
                "description" => $shortDescription,
                "sellerFeeBasisPoints" => 1000,
                "attributes" => [
                    ["trait_type" => "uuid", "value" => $id],
                    ["trait_type" => "color", "value" => ""]
                ]
            ];

            // Сохраняем JSON-файл
            file_put_contents($jsonFilePath, json_encode($jsonData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        }
    } else {
        echo "Image {$number}.png not found.\n";
    }
}

echo "Process completed successfully.\n";
?>
