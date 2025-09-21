<?php 
function json_out($ok = true, $data = [], $msg = '')
{
    header('Content-Type: application/json');
    echo json_encode(['ok' => $ok, 'data' => $data, 'msg' => $msg]);
    exit;
}

function post($k, $d = null)
{
    return $_POST[$k] ?? $d;
}
function get($k, $d = null)
{
    return $_GET[$k] ?? $d;
}