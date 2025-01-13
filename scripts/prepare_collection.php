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
$finalDir = "/home/andrei/projects/catcol/nft/assets/";

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
    $fileNumber = str_pad($number, 2, '0', STR_PAD_LEFT);
    $shortDescription = $row['short_description'] ?? '';

    $copiesNumber = 10;
    $imagePath = $assetsDir . $fileNumber . ".jpg";
    if (file_exists($imagePath)) {
        // Создаем 100 копий изображения
        for ($i = 1; $i <= $copiesNumber; $i++) {
            $newNumber = (($number - 1) * $copiesNumber) + $i - 1;
            $newFileName = "$newNumber.jpg";
            $newImagePath = $finalDir . $newFileName;

            // Копируем файл
            copy($imagePath, $newImagePath);

            // Создаем JSON-файл
            $jsonFileName = "$newNumber.json";
            $jsonFilePath = $finalDir . $jsonFileName;

            $jsonData = [
                "name" => $title . ' #'.str_pad($i, 2, '0', STR_PAD_LEFT),
                "symbol" => "NFTCATS",
                "image" => $newFileName,
                "properties" => [
                    "files" => [
                        ["uri" => $newFileName, "type" => "image/jpeg"]
                    ],
                    "category" => "image"
                ],
                "description" => $shortDescription,
                "sellerFeeBasisPoints" => 1000,
                "attributes" => [
                    ["trait_type" => "uuid", "value" => $id],
                ]
            ];

            // Сохраняем JSON-файл
            file_put_contents($jsonFilePath, json_encode($jsonData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        }
    } else {
        echo "Image {$number}.jpg not found.\n";
    }
}

echo "Process completed successfully.\n";
?>
