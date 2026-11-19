# Test complet du systeme email Clorivo
# Lance: .\test-emails.ps1

$BASE = "https://vcptpgmsxwynbobsmmdd.supabase.co"
$KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjcHRwZ21zeHd5bmJvYnNtbWRkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDEzODgyMywiZXhwIjoyMDk1NzE0ODIzfQ.ZASWKB_RU16Z8U3XNjiU-kT5NmE_cDUokjhT_lmkYFU"
$H    = @{ "Authorization" = "Bearer $KEY"; "Content-Type" = "application/json"; "apikey" = $KEY }

function Call-Webhook($name, $path, $body) {
    Write-Host ""
    Write-Host "=== $name ===" -ForegroundColor Cyan
    try {
        $json = $body | ConvertTo-Json -Depth 10
        $r = Invoke-WebRequest -Method POST "$BASE/functions/v1/$path" -Headers $H -Body $json -UseBasicParsing
        $content = $r.Content | ConvertFrom-Json
        if ($content.ok) {
            Write-Host "SUCCES - email envoye!" -ForegroundColor Green
        } else {
            Write-Host "Reponse: $($r.Content)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "ERREUR: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
}

# 1. Recuperer les vrais IDs depuis la DB
Write-Host ""
Write-Host ">>> Recuperation des utilisateurs..." -ForegroundColor White

$buyerResp = Invoke-WebRequest -Method GET "$BASE/rest/v1/profiles?select=id,email,full_name&email=not.is.null&limit=1" -Headers $H -UseBasicParsing
$buyer = ($buyerResp.Content | ConvertFrom-Json)[0]
Write-Host "Acheteur: $($buyer.full_name) <$($buyer.email)>" -ForegroundColor Green

$sellerResp = Invoke-WebRequest -Method GET "$BASE/rest/v1/profiles?select=id,email,full_name&role=eq.seller&email=not.is.null&limit=1" -Headers $H -UseBasicParsing
$seller = ($sellerResp.Content | ConvertFrom-Json)[0]
Write-Host "Vendeur: $($seller.full_name) <$($seller.email)>" -ForegroundColor Green

$fakeOrderId = "aaaabbbb-cccc-dddd-eeee-ffff00001234"

# 2. Test email confirmation de commande
$orderPayload = @{
    record = @{
        id             = $fakeOrderId
        buyer_id       = $buyer.id
        total_amount   = 129.99
        status         = "pending"
        shipping_address = @{ street = "42 rue du Test"; city = "Montreal"; zip = "H2X1Y5"; country = "Canada" }
    }
}

# Inserer temporairement une commande et des articles pour que on-new-order fonctionne
Write-Host ""
Write-Host ">>> Insertion commande de test en DB..." -ForegroundColor White
$orderInsert = @{
    id             = $fakeOrderId
    buyer_id       = $buyer.id
    total_amount   = 129.99
    status         = "pending"
    shipping_address = '{"street":"42 rue du Test","city":"Montreal","zip":"H2X1Y5","country":"Canada"}'
} | ConvertTo-Json

try {
    $ins = Invoke-WebRequest -Method POST "$BASE/rest/v1/orders" -Headers ($H + @{"Prefer"="return=minimal"}) -Body $orderInsert -UseBasicParsing
    Write-Host "Commande inseree en DB" -ForegroundColor Green

    # Inserer un article
    $itemInsert = @{
        order_id   = $fakeOrderId
        seller_id  = $seller.id
        title      = "Produit de test"
        unit_price = 64.99
        quantity   = 2
    } | ConvertTo-Json
    Invoke-WebRequest -Method POST "$BASE/rest/v1/order_items" -Headers ($H + @{"Prefer"="return=minimal"}) -Body $itemInsert -UseBasicParsing | Out-Null
    Write-Host "Article insere" -ForegroundColor Green
} catch {
    Write-Host "Insertion DB echouee: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    Write-Host "On continue avec simulation directe..." -ForegroundColor Yellow
}

Call-Webhook "TEST 1 - Email confirmation commande (acheteur + vendeurs)" "on-new-order" $orderPayload

Start-Sleep -Seconds 2

# 3. Test email statut expediee
$shippedPayload = @{
    record = @{
        id             = $fakeOrderId
        buyer_id       = $buyer.id
        total_amount   = 129.99
        status         = "shipped"
        tracking_number = "TRACK-CLORIVO-TEST-999"
    }
    old_record = @{
        id             = $fakeOrderId
        buyer_id       = $buyer.id
        total_amount   = 129.99
        status         = "pending"
        tracking_number = $null
    }
}
Call-Webhook "TEST 2 - Email commande expediee avec suivi" "on-order-status" $shippedPayload

Start-Sleep -Seconds 2

# 4. Test email statut livree
$deliveredPayload = @{
    record = @{
        id           = $fakeOrderId
        buyer_id     = $buyer.id
        total_amount = 129.99
        status       = "delivered"
        tracking_number = "TRACK-CLORIVO-TEST-999"
    }
    old_record = @{
        id           = $fakeOrderId
        buyer_id     = $buyer.id
        total_amount = 129.99
        status       = "shipped"
        tracking_number = "TRACK-CLORIVO-TEST-999"
    }
}
Call-Webhook "TEST 3 - Email commande livree" "on-order-status" $deliveredPayload

Start-Sleep -Seconds 2

# 5. Test KYC approuve
$kycResp = Invoke-WebRequest -Method GET "$BASE/rest/v1/kyc_requests?select=id,seller_id,status&limit=1" -Headers $H -UseBasicParsing
$kyc = ($kycResp.Content | ConvertFrom-Json)[0]
if ($kyc) {
    $kycPayload = @{
        record     = @{ id=$kyc.id; seller_id=$kyc.seller_id; status="approved"; review_notes=$null }
        old_record = @{ id=$kyc.id; seller_id=$kyc.seller_id; status="pending";  review_notes=$null }
    }
    Call-Webhook "TEST 4 - Email KYC approuve (vendeur)" "on-kyc-update" $kycPayload
} else {
    Write-Host ""
    Write-Host "=== TEST 4 - KYC ===" -ForegroundColor Cyan
    Write-Host "SKIP: aucun kyc_request dans la DB" -ForegroundColor Yellow
}

# 6. Nettoyage
Write-Host ""
Write-Host ">>> Nettoyage..." -ForegroundColor White
try {
    Invoke-WebRequest -Method DELETE "$BASE/rest/v1/order_items?order_id=eq.$fakeOrderId" -Headers $H -UseBasicParsing | Out-Null
    Invoke-WebRequest -Method DELETE "$BASE/rest/v1/orders?id=eq.$fakeOrderId" -Headers $H -UseBasicParsing | Out-Null
    Write-Host "Donnees de test supprimees." -ForegroundColor Green
} catch {
    Write-Host "Nettoyage: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TESTS TERMINES - Verifie ta boite mail!" -ForegroundColor Green
Write-Host "Tu dois avoir recu:" -ForegroundColor White
Write-Host "  1. Confirmation commande" -ForegroundColor White
Write-Host "  2. Commande expediee + numero de suivi" -ForegroundColor White
Write-Host "  3. Commande livree" -ForegroundColor White
Write-Host "  4. KYC approuve (si kyc existe)" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
