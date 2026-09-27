$port = 8080
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $port)
$listener.Start()
Write-Host "Multi-threaded TCP Web Server listening on port $port"

$root = $PSScriptRoot

while ($true) {
    try {
        $client = $listener.AcceptTcpClient()
        [System.Threading.ThreadPool]::QueueUserWorkItem({
            param($c)
            try {
                $stream = $c.GetStream()
                $stream.ReadTimeout = 5000
                $stream.WriteTimeout = 5000

                $buffer = New-Object byte[] 4096
                $read = $stream.Read($buffer, 0, $buffer.Length)
                if ($read -le 0) { $c.Close(); return }

                $requestStr = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $read)
                $firstLine = $requestStr.Split("`n")[0].Trim()
                $parts = $firstLine.Split(' ')

                if ($parts.Length -ge 2) {
                    $rawUrl = $parts[1].Split('?')[0].TrimStart('/')
                    if ([string]::IsNullOrEmpty($rawUrl)) { $rawUrl = "index.html" }

                    $filePath = [System.IO.Path]::Combine($root, [System.Uri]::UnescapeDataString($rawUrl))

                    if ([System.IO.File]::Exists($filePath)) {
                        $bytes = [System.IO.File]::ReadAllBytes($filePath)
                        $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                        $contentType = switch ($ext) {
                            ".html" { "text/html; charset=utf-8" }
                            ".css"  { "text/css; charset=utf-8" }
                            ".js"   { "application/javascript; charset=utf-8" }
                            ".jpg"  { "image/jpeg" }
                            ".jpeg" { "image/jpeg" }
                            ".png"  { "image/png" }
                            default { "application/octet-stream" }
                        }

                        $headerStr = "HTTP/1.1 200 OK`r`n" +
                                     "Content-Type: $contentType`r`n" +
                                     "Content-Length: $($bytes.Length)`r`n" +
                                     "Access-Control-Allow-Origin: *`r`n" +
                                     "Connection: close`r`n`r`n"
                        $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($headerStr)

                        $stream.Write($headerBytes, 0, $headerBytes.Length)
                        $stream.Write($bytes, 0, $bytes.Length)
                        $stream.Flush()
                    } else {
                        $nfStr = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain`r`nConnection: close`r`n`r`n404 Not Found"
                        $nfBytes = [System.Text.Encoding]::UTF8.GetBytes($nfStr)
                        $stream.Write($nfBytes, 0, $nfBytes.Length)
                        $stream.Flush()
                    }
                }
            } catch {
                # ignore client disconnects
            } finally {
                try { $c.Close() } catch {}
            }
        }, $client)
    } catch {
        # continue loop
    }
}
