<?php

$appkey = '3375264401';
$url = 'http://api.t.sina.com.cn/statuses/public_timeline.json?source='.$appkey.'&count=5';
$ch = curl_init($url);
$fp = fopen("example_homepage.txt", "w");

curl_setopt($ch, CURLOPT_FILE, $fp);
curl_setopt($ch, CURLOPT_HEADER, 0);

curl_exec($ch);
curl_close($ch);
fclose($fp);
