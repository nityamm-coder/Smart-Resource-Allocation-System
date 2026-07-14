# Create download directory
$dir = Join-Path $PSScriptRoot "stitch_screens"
if (!(Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir | Out-Null
}

$urls = @{
    "L2_Trust_Layer.html" = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ6Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpZCiVodG1sXzAwMDY1NjgyYjAwMTg5N2YwMzM4NGU0NDVlMGIzYmM5EgoSBhCY7tHzUhgBkgEjCgpwcm9qZWN0X2lkEhVCEzg5Njc1OTIwMTIyNTc0OTUyNDM&filename=&opi=89354086"
    "Live_Tracking_Portal.html" = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ6Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpZCiVodG1sXzAwMDY1NjZmMDBkYzRiOTQwNTAzYzJkYjk3MTg1YmYyEgoSBhCY7tHzUhgBkgEjCgpwcm9qZWN0X2lkEhVCEzg5Njc1OTIwMTIyNTc0OTUyNDM&filename=&opi=89354086"
    "Victim_Portal.html" = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ6Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpZCiVodG1sXzAwMDY1NjdlOGMxNWE2ZTAwMzM4NWJjOTY2MzU4OWYwEgoSBhCY7tHzUhgBkgEjCgpwcm9qZWN0X2lkEhVCEzg5Njc1OTIwMTIyNTc0OTUyNDM&filename=&opi=89354086"
    "Volunteer_Directory.html" = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ6Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpZCiVodG1sXzAwMDY1NjZmMDB1YzVmNTEwMzM4NGU0NDVlMGIzYmM5EgoSBhCY7tHzUhgBkgEjCgpwcm9qZWN0X2lkEhVCEzg5Njc1OTIwMTIyNTc0OTUyNDM&filename=&opi=89354086"
    "Relief_Supply_Inventory.html" = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ6Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpZCiVodG1sXzAwMDY1NjZmMDA3NDNkYzAwMzgzOWJiMjFkMjZhNTMzEgoSBhCY7tHzUhgBkgEjCgpwcm9qZWN0X2lkEhVCEzg5Njc1OTIwMTIyNTc0OTUyNDM&filename=&opi=89354086"
    "Home_Page.html" = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ6Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpZCiVodG1sXzAwMDY1Njg0MGZjNWIzNzcwMzgzOTg2NGVjMjQzYzkyEgoSBhCY7tHzUhgBkgEjCgpwcm9qZWN0X2lkEhVCEzg5Njc1OTIwMTIyNTc0OTUyNDM&filename=&opi=89354086"
    "Resolved_Request.html" = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ6Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpZCiVodG1sX2U5MTM5OWJmY2M3ODQ4NjNiOTdlMjlhYjQxMWIyYjA2EgoSBhCY7tHzUhgBkgEjCgpwcm9qZWN0X2lkEhVCEzg5Njc1OTIwMTIyNTc0OTUyNDM&filename=&opi=89354086"
    "Requests_Board.html" = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ6Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpZCiVodG1sXzAwMDY1NjdlY2RkMWIwY2QwNGVhYjcyNzVhMjU1YWFjEgoSBhCY7tHzUhgBkgEjCgpwcm9qZWN0X2lkEhVCEzg5Njc1OTIwMTIyNTc0OTUyNDM&filename=&opi=89354086"
    "Requests_Board_Compact.html" = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ6Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpZCiVodG1sXzVmNjg0MDhjOTc0YTRhMTRhYzY3YjEwNWY4ZjE3YzkwEgoSBhCY7tHzUhgBkgEjCgpwcm9qZWN0X2lkEhVCEzg5Njc1OTIwMTIyNTc0OTUyNDM&filename=&opi=89354086"
    "NGO_Dashboard.html" = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ6Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpZCiVodG1sXzAwMDY1NjZlZWJhYmFjNDYwMzM4NDdlMDY4MTBkZTlhEgoSBhCY7tHzUhgBkgEjCgpwcm9qZWN0X2lkEhVCEzg5Njc1OTIwMTIyNTc0OTUyNDM&filename=&opi=89354086"
}

foreach ($name in $urls.Keys) {
    $url = $urls[$name]
    $filePath = Join-Path $dir $name
    Write-Host "Downloading $name..."
    try {
        Invoke-RestMethod -Uri $url -OutFile $filePath -UserAgent "Mozilla/5.0"
        Write-Host "Downloaded $name successfully."
    } catch {
        Write-Error "Failed to download $name. Error: $_"
    }
}
