param(
  [Parameter(Mandatory = $true)][string]$Source,
  [string]$OutputDirectory = "prototype/assets/customers"
)

Add-Type -AssemblyName System.Drawing

$sourceImage = [System.Drawing.Bitmap]::FromFile((Resolve-Path -LiteralPath $Source))
$quadrants = @(
  @{ X = 0; Y = 0 },
  @{ X = [int]($sourceImage.Width / 2); Y = 0 },
  @{ X = 0; Y = [int]($sourceImage.Height / 2) },
  @{ X = [int]($sourceImage.Width / 2); Y = [int]($sourceImage.Height / 2) }
)
$cellWidth = [int]($sourceImage.Width / 2)
$cellHeight = [int]($sourceImage.Height / 2)

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null

for ($part = 0; $part -lt $quadrants.Count; $part += 1) {
  $cell = New-Object System.Drawing.Bitmap $cellWidth, $cellHeight, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($cell)
  $graphics.DrawImage($sourceImage, (New-Object System.Drawing.Rectangle 0, 0, $cellWidth, $cellHeight), (New-Object System.Drawing.Rectangle $quadrants[$part].X, $quadrants[$part].Y, $cellWidth, $cellHeight), [System.Drawing.GraphicsUnit]::Pixel)
  $graphics.Dispose()

  $minX = $cellWidth
  $minY = $cellHeight
  $maxX = 0
  $maxY = 0
  for ($y = 0; $y -lt $cellHeight; $y += 1) {
    for ($x = 0; $x -lt $cellWidth; $x += 1) {
      $pixel = $cell.GetPixel($x, $y)
      $neutral = [Math]::Max($pixel.R, [Math]::Max($pixel.G, $pixel.B)) - [Math]::Min($pixel.R, [Math]::Min($pixel.G, $pixel.B))
      $background = $pixel.R -ge 225 -and $pixel.G -ge 225 -and $pixel.B -ge 225 -and $neutral -le 8
      if ($background) {
        $cell.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
      } else {
        $minX = [Math]::Min($minX, $x); $maxX = [Math]::Max($maxX, $x)
        $minY = [Math]::Min($minY, $y); $maxY = [Math]::Max($maxY, $y)
      }
    }
  }

  $contentWidth = $maxX - $minX + 1
  $contentHeight = $maxY - $minY + 1
  $scale = [Math]::Min(118.0 / $contentWidth, 154.0 / $contentHeight)
  $drawWidth = [Math]::Max(1, [int][Math]::Round($contentWidth * $scale))
  $drawHeight = [Math]::Max(1, [int][Math]::Round($contentHeight * $scale))
  $targetX = [int][Math]::Round((128 - $drawWidth) / 2)
  $targetY = 160 - $drawHeight
  $target = New-Object System.Drawing.Bitmap 128, 160, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $targetGraphics = [System.Drawing.Graphics]::FromImage($target)
  $targetGraphics.Clear([System.Drawing.Color]::Transparent)
  $targetGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
  $targetGraphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
  $targetGraphics.DrawImage($cell, (New-Object System.Drawing.Rectangle $targetX, $targetY, $drawWidth, $drawHeight), (New-Object System.Drawing.Rectangle $minX, $minY, $contentWidth, $contentHeight), [System.Drawing.GraphicsUnit]::Pixel)
  $targetGraphics.Dispose()

  $output = Join-Path $OutputDirectory ("customer_{0}.png" -f ($part + 4))
  $target.Save($output, [System.Drawing.Imaging.ImageFormat]::Png)
  $target.Dispose()
  $cell.Dispose()
}

$sourceImage.Dispose()
