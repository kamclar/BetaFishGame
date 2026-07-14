param([Parameter(Mandatory=$true)][string]$Source)
Add-Type -AssemblyName System.Drawing
$src=[System.Drawing.Bitmap]::FromFile((Resolve-Path $Source)); $cw=[int]($src.Width/2); $ch=$src.Height
New-Item -ItemType Directory -Force prototype/assets/equipment | Out-Null
for($part=0;$part -lt 2;$part++){
  $cell=New-Object System.Drawing.Bitmap $cw,$ch,([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g=[System.Drawing.Graphics]::FromImage($cell);$g.DrawImage($src,(New-Object System.Drawing.Rectangle 0,0,$cw,$ch),(New-Object System.Drawing.Rectangle ($part*$cw),0,$cw,$ch),[System.Drawing.GraphicsUnit]::Pixel);$g.Dispose()
  $minX=$cw;$minY=$ch;$maxX=0;$maxY=0
  for($y=0;$y -lt $ch;$y++){for($x=0;$x -lt $cw;$x++){$p=$cell.GetPixel($x,$y);$spread=[Math]::Max($p.R,[Math]::Max($p.G,$p.B))-[Math]::Min($p.R,[Math]::Min($p.G,$p.B));if($p.R-ge 225-and$p.G-ge 225-and$p.B-ge 225-and$spread-le 8){$cell.SetPixel($x,$y,[System.Drawing.Color]::Transparent)}else{$minX=[Math]::Min($minX,$x);$maxX=[Math]::Max($maxX,$x);$minY=[Math]::Min($minY,$y);$maxY=[Math]::Max($maxY,$y)}}}
  $w=$maxX-$minX+1;$h=$maxY-$minY+1;$scale=[Math]::Min(92.0/$w,92.0/$h);$dw=[int]($w*$scale);$dh=[int]($h*$scale)
  $out=New-Object System.Drawing.Bitmap 96,96,([System.Drawing.Imaging.PixelFormat]::Format32bppArgb);$og=[System.Drawing.Graphics]::FromImage($out);$og.Clear([System.Drawing.Color]::Transparent);$og.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor;$og.DrawImage($cell,(New-Object System.Drawing.Rectangle ([int]((96-$dw)/2)),(96-$dh),$dw,$dh),(New-Object System.Drawing.Rectangle $minX,$minY,$w,$h),[System.Drawing.GraphicsUnit]::Pixel);$og.Dispose();$out.Save("prototype/assets/equipment/filter_$($part+1).png",[System.Drawing.Imaging.ImageFormat]::Png);$out.Dispose();$cell.Dispose()
}
$src.Dispose()
