<?php

header('Content-Type: text/plain');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: *');

$dirname = $_GET['dirname'];
$ext = $_GET['ext'];
if (!$dirname) $dirname =getcwd();
if (!$ext) $ext = 'svg';
$files = glob($dirname.'/*.'.$ext);
usort($files, function($a, $b) {
    return filemtime($a) < filemtime($b);
});

foreach($files as $file){
	echo $file . "\n";
}

?>
