# מדריך יישום תקשורת CARDCOM - מדריך מפורט ומושלם

## סקירה כללית
מדריך זה מספק הוראות מדויקות ליישום מערכת התשלומים CARDCOM בפרויקט חדש, בהתבסס על הקוד הקיים במערכת MASU.

## ארכיטקטורת המערכת

### 1. מבנה הקבצים הנדרש
```
project_root/
├── partners/
│   ├── classes/
│   │   ├── class.PayEngine.php
│   │   ├── class.CardCom.php
│   │   └── class.MasuPay.php
│   └── cardcom_re/
│       └── result_functions.php
├── sendgrid/
│   └── sendgrid-php.php
└── your_payment_files/
    ├── payment_form.php
    ├── payment_process.php
    └── payment_result.php
```

### 2. מבנה בסיס הנתונים הנדרש

#### טבלת `orders` (הזמנות)
```sql
CREATE TABLE `orders` (
  `orderID` int(11) NOT NULL AUTO_INCREMENT,
  `originalID` int(11) DEFAULT NULL,
  `customerName` varchar(255) DEFAULT NULL,
  `customerPhone` varchar(20) DEFAULT NULL,
  `customerEmail` varchar(255) DEFAULT NULL,
  `customerID` int(11) DEFAULT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `order_status` enum('pending','processing','completed','cancelled','refunded','failed') DEFAULT 'pending',
  `cc_data` text DEFAULT NULL,
  `create_date` timestamp DEFAULT CURRENT_TIMESTAMP,
  `timeFrom` datetime DEFAULT NULL,
  `timeUntil` datetime DEFAULT NULL,
  `fictive_status` int(11) DEFAULT NULL,
  `confirm_time` datetime DEFAULT NULL,
  PRIMARY KEY (`orderID`)
);
```

#### טבלת `orderPayments` (תשלומים)
```sql
CREATE TABLE `orderPayments` (
  `lineID` int(11) NOT NULL AUTO_INCREMENT,
  `orderID` int(11) NOT NULL,
  `payType` enum('ccard','refund','cash') DEFAULT 'ccard',
  `subType` enum('direct','token','manual') DEFAULT 'direct',
  `startTime` datetime DEFAULT NULL,
  `endTime` datetime DEFAULT NULL,
  `sum` decimal(10,2) DEFAULT NULL,
  `complete` tinyint(1) DEFAULT 0,
  `token` tinyint(1) DEFAULT 0,
  `transID` varchar(255) DEFAULT NULL,
  `inputData` text DEFAULT NULL,
  `resultData` text DEFAULT NULL,
  PRIMARY KEY (`lineID`),
  KEY `orderID` (`orderID`)
);
```

## 3. קבצי הליבה הנדרשים

### class.MasuPay.php - המחלקה הראשית
```php
<?php
class MasuPay {
    private $cardcom;
    
    public function __construct() {
        $this->cardcom = new CardCom();
    }
    
    /**
     * ביצוע חיוב ישיר עם טוקן
     */
    public function directPay($amount, $description, $tokenData, $orderID) {
        try {
            $result = $this->cardcom->chargeToken([
                'amount' => $amount,
                'description' => $description,
                'token' => $tokenData['token'],
                'orderID' => $orderID
            ]);
            
            return [
                'success' => $result['success'],
                'transID' => $result['transactionId'] ?? null,
                'message' => $result['message'] ?? '',
                'tokenData' => $tokenData
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage(),
                'transID' => null
            ];
        }
    }
    
    /**
     * ביצוע זיכוי עם טוקן
     */
    public function directRefund($amount, $description, $tokenData, $orderID) {
        try {
            $result = $this->cardcom->refundToken([
                'amount' => $amount,
                'description' => $description,
                'token' => $tokenData['token'],
                'orderID' => $orderID
            ]);
            
            return [
                'success' => $result['success'],
                'transID' => $result['transactionId'] ?? null,
                'message' => $result['message'] ?? '',
                'tokenData' => $tokenData
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage(),
                'transID' => null
            ];
        }
    }
}
```

### class.CardCom.php - ממשק CARDCOM
```php
<?php
class CardCom {
    private $terminalNumber;
    private $userName;
    private $apiKey;
    private $baseUrl;
    
    public function __construct() {
        // הגדרות CARDCOM - יש להחליף בנתונים האמיתיים
        $this->terminalNumber = 'YOUR_TERMINAL_NUMBER';
        $this->userName = 'YOUR_USERNAME';
        $this->apiKey = 'YOUR_API_KEY';
        $this->baseUrl = 'https://secure.cardcom.solutions/api/v11/';
    }
    
    /**
     * יצירת תשלום חדש
     */
    public function createPayment($data) {
        $payload = [
            'TerminalNumber' => $this->terminalNumber,
            'UserName' => $this->userName,
            'APIKey' => $this->apiKey,
            'Operation' => 1, // חיוב
            'Currency' => 1, // שקל
            'Sum' => $data['amount'],
            'Description' => $data['description'],
            'ReturnValue' => $data['orderID'],
            'SuccessRedirectUrl' => $data['successUrl'],
            'ErrorRedirectUrl' => $data['errorUrl'],
            'CreateToken' => true // יצירת טוקן לחיובים עתידיים
        ];
        
        return $this->sendRequest('LowProfile', $payload);
    }
    
    /**
     * חיוב עם טוקן קיים
     */
    public function chargeToken($data) {
        $payload = [
            'TerminalNumber' => $this->terminalNumber,
            'UserName' => $this->userName,
            'APIKey' => $this->apiKey,
            'Operation' => 1,
            'Currency' => 1,
            'Sum' => $data['amount'],
            'Description' => $data['description'],
            'Token' => $data['token'],
            'ReturnValue' => $data['orderID']
        ];
        
        return $this->sendRequest('Charge', $payload);
    }
    
    /**
     * זיכוי עם טוקן
     */
    public function refundToken($data) {
        $payload = [
            'TerminalNumber' => $this->terminalNumber,
            'UserName' => $this->userName,
            'APIKey' => $this->apiKey,
            'Operation' => 2, // זיכוי
            'Currency' => 1,
            'Sum' => $data['amount'],
            'Description' => $data['description'],
            'Token' => $data['token'],
            'ReturnValue' => $data['orderID']
        ];
        
        return $this->sendRequest('Charge', $payload);
    }
    
    /**
     * שליחת בקשה ל-CARDCOM
     */
    private function sendRequest($endpoint, $data) {
        $url = $this->baseUrl . $endpoint;
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Accept: application/json'
        ]);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        if ($error) {
            throw new Exception('CURL Error: ' . $error);
        }
        
        if ($httpCode !== 200) {
            throw new Exception('HTTP Error: ' . $httpCode);
        }
        
        $result = json_decode($response, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('JSON Decode Error: ' . json_last_error_msg());
        }
        
        return $result;
    }
}
```

## 4. דף התשלום (payment_form.php)

```php
<?php
// הכנת הזמנה לתשלום
$orderID = $_GET['orderID'] ?? 0;
$order = udb::single_row("SELECT * FROM orders WHERE orderID = " . intval($orderID));

if (!$order) {
    die('הזמנה לא נמצאה');
}

// יצירת תשלום ב-CARDCOM
include_once 'partners/classes/class.CardCom.php';
$cardcom = new CardCom();

$paymentData = [
    'amount' => $order['price'],
    'description' => 'הזמנה מספר ' . $order['orderID'],
    'orderID' => $order['orderID'],
    'successUrl' => 'https://yoursite.com/payment_success.php',
    'errorUrl' => 'https://yoursite.com/payment_error.php'
];

try {
    $paymentResult = $cardcom->createPayment($paymentData);
    
    if ($paymentResult['ResponseCode'] == 0) {
        // שמירת נתוני התשלום
        $payID = udb::insert('orderPayments', [
            'orderID' => $order['orderID'],
            'payType' => 'ccard',
            'subType' => 'token',
            'startTime' => date('Y-m-d H:i:s'),
            'sum' => $order['price'],
            'inputData' => json_encode($paymentData, JSON_UNESCAPED_UNICODE)
        ]);
        
        // הפניה לדף התשלום של CARDCOM
        header('Location: ' . $paymentResult['url']);
        exit;
    } else {
        throw new Exception($paymentResult['Description']);
    }
} catch (Exception $e) {
    echo 'שגיאה ביצירת התשלום: ' . $e->getMessage();
}
?>
```

## 5. עיבוד תוצאות התשלום (payment_result.php)

```php
<?php
include_once 'partners/classes/class.CardCom.php';

// קבלת נתונים מ-CARDCOM
$orderID = $_POST['ReturnValue'] ?? $_GET['ReturnValue'] ?? 0;
$transactionId = $_POST['TransactionId'] ?? $_GET['TransactionId'] ?? '';
$responseCode = $_POST['ResponseCode'] ?? $_GET['ResponseCode'] ?? -1;

if (!$orderID) {
    die('מספר הזמנה חסר');
}

$order = udb::single_row("SELECT * FROM orders WHERE orderID = " . intval($orderID));
if (!$order) {
    die('הזמנה לא נמצאה');
}

// חיפוש התשלום בבסיס הנתונים
$payment = udb::single_row("SELECT * FROM orderPayments WHERE orderID = " . $order['orderID'] . " AND complete = 0 ORDER BY lineID DESC LIMIT 1");

if (!$payment) {
    die('תשלום לא נמצא');
}

$success = ($responseCode == 0);

// עדכון סטטוס התשלום
$updateData = [
    'complete' => $success ? 1 : 0,
    'transID' => $transactionId,
    'endTime' => date('Y-m-d H:i:s'),
    'token' => $success ? 1 : 0,
    'resultData' => json_encode($_POST, JSON_UNESCAPED_UNICODE)
];

udb::update('orderPayments', $updateData, 'lineID = ' . $payment['lineID']);

if ($success) {
    // עדכון סטטוס ההזמנה
    udb::update('orders', [
        'order_status' => 'processing',
        'cc_data' => json_encode([
            [
                'comment_content' => 'תשלום בכרטיס אשראי - ' . substr($transactionId, -4),
                'last4' => substr($transactionId, -4)
            ]
        ], JSON_UNESCAPED_UNICODE)
    ], 'orderID = ' . $order['orderID']);
    
    // שליחת אימייל ללקוח
    include_once 'partners/cardcom_re/result_functions.php';
    include_once 'sendgrid/sendgrid-php.php';
    
    $orders = [$order];
    send_customer_booking_email($orders);
    
    echo 'התשלום בוצע בהצלחה!';
} else {
    echo 'התשלום נכשל. אנא נסה שוב.';
}
?>
```

## 6. חיוב/זיכוי ישיר (direct_charge.php)

```php
<?php
include_once 'partners/classes/class.MasuPay.php';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $orderID = intval($_POST['orderID']);
    $amount = floatval($_POST['amount']);
    $description = $_POST['description'];
    $action = $_POST['action']; // 'charge' או 'refund'
    
    $order = udb::single_row("SELECT * FROM orders WHERE orderID = " . $orderID);
    if (!$order) {
        die('הזמנה לא נמצאה');
    }
    
    // חיפוש טוקן קיים
    $payment = udb::single_row("SELECT * FROM orderPayments WHERE orderID = " . $order['orderID'] . " AND complete = 1 AND token = 1 ORDER BY lineID ASC LIMIT 1");
    $resultData = $payment['resultData'] ? json_decode($payment['resultData'], true) : null;
    
    if (empty($resultData['tokenData'])) {
        die('לא נמצא טוקן לחיוב');
    }
    
    $tokenData = $resultData['tokenData'];
    
    // יצירת רשומת תשלום חדשה
    $payID = udb::insert('orderPayments', [
        'payType' => ($action == 'refund') ? 'refund' : 'ccard',
        'subType' => 'direct',
        'orderID' => $order['orderID'],
        'startTime' => date('Y-m-d H:i:s'),
        'sum' => $amount,
        'inputData' => json_encode(['type' => 'direct', 'desc' => $description], JSON_UNESCAPED_UNICODE)
    ]);
    
    // ביצוע החיוב/זיכוי
    $client = new MasuPay();
    
    if ($action == 'refund') {
        $result = $client->directRefund($amount, $description, $tokenData, $order['orderID']);
    } else {
        $result = $client->directPay($amount, $description, $tokenData, $order['orderID']);
    }
    
    // עדכון התוצאה
    $update = [
        'complete' => $result['success'] ? 1 : 0,
        'transID' => $result['transID'],
        'endTime' => date('Y-m-d H:i:s'),
        'resultData' => json_encode($result, JSON_UNESCAPED_UNICODE)
    ];
    
    udb::update('orderPayments', $update, 'lineID = ' . $payID);
    
    if ($result['success']) {
        echo 'הפעולה בוצעה בהצלחה!';
    } else {
        echo 'הפעולה נכשלה: ' . $result['message'];
    }
}
?>
```

## 7. הגדרות נדרשות

### קובץ הגדרות (config.php)
```php
<?php
// הגדרות CARDCOM
define('CARDCOM_TERMINAL', 'YOUR_TERMINAL_NUMBER');
define('CARDCOM_USERNAME', 'YOUR_USERNAME');
define('CARDCOM_API_KEY', 'YOUR_API_KEY');
define('CARDCOM_TEST_MODE', true); // false לסביבת ייצור

// הגדרות SendGrid
define('SENDGRID_API_KEY', 'YOUR_SENDGRID_API_KEY');

// הגדרות בסיס נתונים
define('DB_HOST', 'localhost');
define('DB_NAME', 'your_database');
define('DB_USER', 'your_username');
define('DB_PASS', 'your_password');
?>
```

## 8. פונקציות עזר נדרשות

### functions.php
```php
<?php
/**
 * פונקציית עזר לבסיס נתונים
 */
class udb {
    private static $connection;
    
    public static function getConnection() {
        if (!self::$connection) {
            self::$connection = new PDO(
                'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME,
                DB_USER,
                DB_PASS,
                [PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8"]
            );
        }
        return self::$connection;
    }
    
    public static function single_row($query) {
        $stmt = self::getConnection()->prepare($query);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    public static function insert($table, $data) {
        $fields = implode(',', array_keys($data));
        $placeholders = ':' . implode(', :', array_keys($data));
        
        $query = "INSERT INTO {$table} ({$fields}) VALUES ({$placeholders})";
        $stmt = self::getConnection()->prepare($query);
        $stmt->execute($data);
        
        return self::getConnection()->lastInsertId();
    }
    
    public static function update($table, $data, $where) {
        $set = [];
        foreach ($data as $key => $value) {
            $set[] = "{$key} = :{$key}";
        }
        $setClause = implode(', ', $set);
        
        $query = "UPDATE {$table} SET {$setClause} WHERE {$where}";
        $stmt = self::getConnection()->prepare($query);
        return $stmt->execute($data);
    }
}

/**
 * פונקציית typemap לוולידציה
 */
function typemap($data, $rules) {
    $result = [];
    foreach ($rules as $key => $type) {
        if (isset($data[$key])) {
            switch ($type) {
                case 'int':
                    $result[$key] = intval($data[$key]);
                    break;
                case 'float':
                    $result[$key] = floatval($data[$key]);
                    break;
                case 'string':
                    $result[$key] = strval($data[$key]);
                    break;
                default:
                    $result[$key] = $data[$key];
            }
        }
    }
    return $result;
}
?>
```

## 9. שלבי היישום המדויקים

### שלב 1: הכנת הסביבה
1. צור את מבנה התיקיות כמתואר למעלה
2. העתק את קבצי המחלקות לתיקיית `partners/classes/`
3. הגדר את פרטי החיבור ל-CARDCOM בקובץ ההגדרות

### שלב 2: הכנת בסיס הנתונים
1. צור את הטבלאות `orders` ו-`orderPayments`
2. ודא שיש חיבור תקין לבסיס הנתונים

### שלב 3: יישום דף התשלום
1. צור דף הזמנה שמכין את נתוני התשלום
2. הטמע את הקוד ליצירת תשלום ב-CARDCOM
3. הוסף הפניה לדף התשלום של CARDCOM

### שלב 4: עיבוד תוצאות
1. צור דף לקבלת תוצאות התשלום
2. הטמע לוגיקה לעדכון סטטוס ההזמנה
3. הוסף שליחת אימיילים ללקוח

### שלב 5: חיובים ישירים
1. צור ממשק לחיובים וזיכויים ישירים
2. הטמע שימוש בטוקנים שמורים
3. הוסף לוגיקת אבטחה ווולידציה

## 10. נקודות חשובות לזכור

### אבטחה
- **אל תשמור פרטי כרטיס אשראי** - השתמש רק בטוקנים
- ודא שכל הקלטים מוולדים לפני השימוש
- השתמש ב-HTTPS בלבד לכל התקשורת
- הגדר timeout מתאים לבקשות HTTP

### ניהול שגיאות
- תמיד בדוק את קוד התגובה מ-CARDCOM
- שמור לוגים מפורטים לכל הפעולות
- הצג הודעות שגיאה ידידותיות למשתמש
- הטמע מנגנון retry לבקשות שנכשלו

### ביצועים
- השתמש בחיבור מאגד לבסיס הנתונים
- הטמע caching למידע שלא משתנה
- בדוק ביצועים תחת עומס

### בדיקות
- בדוק את כל התרחישים: תשלום מוצלח, כושל, זיכוי
- ודא שהטוקנים נשמרים ומשתמשים בהם נכון
- בדוק את שליחת האימיילים
- ודא שהסטטוסים מתעדכנים נכון

## 11. דוגמה מלאה לשימוש

```php
<?php
// דוגמה מלאה לתהליך תשלום

// 1. יצירת הזמנה
$orderData = [
    'customerName' => 'יוסי כהן',
    'customerEmail' => 'yossi@example.com',
    'customerPhone' => '0501234567',
    'price' => 150.00,
    'order_status' => 'pending'
];

$orderID = udb::insert('orders', $orderData);

// 2. יצירת תשלום
include_once 'partners/classes/class.CardCom.php';
$cardcom = new CardCom();

$paymentData = [
    'amount' => 150.00,
    'description' => 'הזמנה מספר ' . $orderID,
    'orderID' => $orderID,
    'successUrl' => 'https://yoursite.com/payment_success.php',
    'errorUrl' => 'https://yoursite.com/payment_error.php'
];

$paymentResult = $cardcom->createPayment($paymentData);

// 3. הפניה לתשלום
if ($paymentResult['ResponseCode'] == 0) {
    header('Location: ' . $paymentResult['url']);
} else {
    echo 'שגיאה: ' . $paymentResult['Description'];
}
?>
```

---

**הערה חשובה:** מדריך זה מבוסס על הקוד הקיים במערכת MASU. יש להתאים את הקוד לצרכים הספציפיים של הפרויקט החדש ולוודא שכל הנתונים (מספרי טרמינל, מפתחות API וכו') מוחלפים בנתונים האמיתיים לפני השימוש בסביבת ייצור.

**זכור:** תמיד בדוק את התקשורת עם CARDCOM בסביבת בדיקות לפני המעבר לסביבת ייצור! 