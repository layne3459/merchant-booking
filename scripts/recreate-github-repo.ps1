# 删除 GitHub 仓库后，在本机 PowerShell（建议系统终端，非 Cursor 内置）执行：
#   cd 仓库根目录
#   .\scripts\recreate-github-repo.ps1
#
# 需要：gh 已登录 layne3459，且 token 含 delete_repo（或已在网页手动删库）

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

$repo = "layne3459/merchant-booking"
$exists = gh repo view $repo 2>$null
if ($LASTEXITCODE -eq 0) {
  Write-Host "正在删除 GitHub 仓库 $repo ..."
  gh repo delete $repo --yes
}

Write-Host "创建新仓库 $repo ..."
gh repo create $repo --public --description "本地商家预约 + 会员小程序 Monorepo"

Write-Host "推送 master（提交对象已不含 Co-authored-by）..."
git push github master --force
git push gitee master --force

Write-Host "完成。请打开 https://github.com/$repo 查看 Contributors。"
