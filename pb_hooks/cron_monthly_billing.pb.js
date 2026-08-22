/// <reference path="../pb_data/types.d.ts" />

// Hook de bootstrap para criar scaer_config caso não exista
onAfterBootstrap((e) => {
    try {
        const configs = $app.findRecordsByFilter("scaer_config", "id != ''", "id", 1, 0);
        if (configs.length === 0) {
            const collection = $app.findCollectionByNameOrId("scaer_config");
            const newConfig = new Record(collection);
            newConfig.set("scaerMonthlyFee", 50.0);
            newConfig.set("currentBillingPeriod", "2026-08");
            newConfig.set("dueDay", 10);
            newConfig.set("clubChangeDeadlineDay", 20);
            $app.save(newConfig);
            console.log("Criado scaer_config inicial.");
        }
    } catch (err) {
        console.error("Erro no bootstrap do scaer_config:", err);
    }
});

// Cron para geração mensal (todo dia 1º à 00:05)
cronAdd("generate_monthly_billing", "5 0 1 * *", () => {
    console.log("Iniciando geração de mensalidades (Cron)...");

    try {
        // 1. Obter config
        const configs = $app.findRecordsByFilter("scaer_config", "id != ''", "id", 1, 0);
        if (configs.length === 0) {
            throw new Error("scaer_config não encontrado.");
        }
        const config = configs[0];
        const scaerFee = config.getFloat("scaerMonthlyFee");
        const billingPeriod = config.getString("currentBillingPeriod");

        const transactionsCollection = $app.findCollectionByNameOrId("transactions");
        const membershipsCollection = $app.findCollectionByNameOrId("club_memberships");

        // 2. Processar transições de membership pendentes
        const pendingEntry = $app.findRecordsByFilter("club_memberships", `status = 'pending_entry' && effectiveFrom <= '${billingPeriod}'`);
        for (let m of pendingEntry) {
            m.set("status", "active");
            $app.save(m);
        }

        const pendingExit = $app.findRecordsByFilter("club_memberships", `status = 'pending_exit' && effectiveFrom <= '${billingPeriod}'`);
        for (let m of pendingExit) {
            m.set("status", "exited");
            $app.save(m);
        }

        // 3. Obter todos os cadetes do banco de auth
        const cadetes = $app.findRecordsByFilter("users", "role = 'cadete'");
        
        let totalCadetsProcessed = 0;
        let totalGeneral = 0;
        let scaerFeeTotal = 0;
        let transactionsCreated = 0;
        let clubBreakdownMap = {};

        for (let user of cadetes) {
            const userId = user.getId();
            const cadetNumber = user.getString("cadetNumber");
            const cadetName = user.getString("name");

            // Tentar obter o registro complementar na coleção 'cadets'
            let cadetProfile = null;
            try {
                const profiles = $app.findRecordsByFilter("cadets", `userId = '${userId}'`);
                if (profiles.length > 0) cadetProfile = profiles[0];
            } catch (e) {}

            const actualCadetId = cadetProfile ? cadetProfile.getId() : userId;

            // a. Mensalidade SCAER
            const existingScaer = $app.findRecordsByFilter("transactions", `cadetId = '${actualCadetId}' && category = 'mensalidade_scaer' && billingPeriod = '${billingPeriod}'`);
            
            if (existingScaer.length === 0) {
                const trScaer = new Record(transactionsCollection);
                trScaer.set("cadetId", actualCadetId);
                trScaer.set("cadetNumber", cadetNumber);
                trScaer.set("cadetName", cadetName);
                trScaer.set("clubId", "SCAER");
                trScaer.set("clubName", "SCAER");
                trScaer.set("description", "Mensalidade SCAER");
                trScaer.set("amount", scaerFee);
                trScaer.set("category", "mensalidade_scaer");
                trScaer.set("billingPeriod", billingPeriod);
                trScaer.set("type", "automatic");
                trScaer.set("status", "pending");
                trScaer.set("createdBy", "system");
                trScaer.set("createdByName", "Sistema");
                
                $app.save(trScaer);
                
                transactionsCreated++;
                totalGeneral += scaerFee;
                scaerFeeTotal += scaerFee;
            }

            // b. Mensalidade Clube
            const memberships = $app.findRecordsByFilter("club_memberships", `userId = '${userId}' && status = 'active'`);
            for (let m of memberships) {
                const clubId = m.getString("clubId");
                const clubName = m.getString("clubName");

                let clubFee = 0;
                try {
                    const clubRecord = $app.findRecordById("clubs", clubId);
                    clubFee = clubRecord.getFloat("monthlyFee");
                } catch(e) {
                    continue; // Pular se clube não existe
                }

                const existingClub = $app.findRecordsByFilter("transactions", `cadetId = '${actualCadetId}' && clubId = '${clubId}' && category = 'mensalidade_clube' && billingPeriod = '${billingPeriod}'`);
                
                if (existingClub.length === 0 && clubFee > 0) {
                    const trClub = new Record(transactionsCollection);
                    trClub.set("cadetId", actualCadetId);
                    trClub.set("cadetNumber", cadetNumber);
                    trClub.set("cadetName", cadetName);
                    trClub.set("clubId", clubId);
                    trClub.set("clubName", clubName);
                    trClub.set("description", `Mensalidade ${clubName}`);
                    trClub.set("amount", clubFee);
                    trClub.set("category", "mensalidade_clube");
                    trClub.set("billingPeriod", billingPeriod);
                    trClub.set("type", "automatic");
                    trClub.set("status", "pending");
                    trClub.set("createdBy", "system");
                    trClub.set("createdByName", "Sistema");
                    
                    $app.save(trClub);

                    transactionsCreated++;
                    totalGeneral += clubFee;

                    if (!clubBreakdownMap[clubId]) {
                        clubBreakdownMap[clubId] = { clubId, clubName, amount: 0, transactionsCount: 0 };
                    }
                    clubBreakdownMap[clubId].amount += clubFee;
                    clubBreakdownMap[clubId].transactionsCount += 1;
                }
            }

            // c. Doações Religiosas
            if (cadetProfile) {
                const relDonationsRaw = cadetProfile.get("religiousDonations");
                if (relDonationsRaw) {
                    let relDonations = {};
                    try {
                        relDonations = typeof relDonationsRaw === 'string' ? JSON.parse(relDonationsRaw) : relDonationsRaw;
                    } catch(e){}

                    for (const [relClubId, amount] of Object.entries(relDonations)) {
                        const donAmt = parseFloat(amount);
                        if (donAmt > 0) {
                            const existingDon = $app.findRecordsByFilter("transactions", `cadetId = '${actualCadetId}' && clubId = '${relClubId}' && category = 'doacao_religiosa' && billingPeriod = '${billingPeriod}'`);
                            
                            if (existingDon.length === 0) {
                                let relClubName = "Doação";
                                try {
                                    const cRec = $app.findRecordById("clubs", relClubId);
                                    relClubName = cRec.getString("name");
                                } catch(e){}

                                const trDon = new Record(transactionsCollection);
                                trDon.set("cadetId", actualCadetId);
                                trDon.set("cadetNumber", cadetNumber);
                                trDon.set("cadetName", cadetName);
                                trDon.set("clubId", relClubId);
                                trDon.set("clubName", relClubName);
                                trDon.set("description", `Doação ${relClubName}`);
                                trDon.set("amount", donAmt);
                                trDon.set("category", "doacao_religiosa");
                                trDon.set("billingPeriod", billingPeriod);
                                trDon.set("type", "automatic");
                                trDon.set("status", "pending");
                                trDon.set("createdBy", "system");
                                trDon.set("createdByName", "Sistema");
                                
                                $app.save(trDon);

                                transactionsCreated++;
                                totalGeneral += donAmt;
                                
                                if (!clubBreakdownMap[relClubId]) {
                                    clubBreakdownMap[relClubId] = { clubId: relClubId, clubName: relClubName, amount: 0, transactionsCount: 0 };
                                }
                                clubBreakdownMap[relClubId].amount += donAmt;
                                clubBreakdownMap[relClubId].transactionsCount += 1;
                            }
                        }
                    }
                }
            }

            totalCadetsProcessed++;
        }

        // 4. Update lastCronRun
        config.set("lastCronRun", new Date().toISOString());
        $app.save(config);

        // 5. Generate/Update monthly_summary
        const summaryCol = $app.findCollectionByNameOrId("monthly_summaries");
        const existingSummaries = $app.findRecordsByFilter("monthly_summaries", `billingPeriod = '${billingPeriod}'`);
        
        let summary;
        if (existingSummaries.length > 0) {
            summary = existingSummaries[0];
            // Atualizar valores existentes (soma)
            summary.set("totalGeneral", summary.getFloat("totalGeneral") + totalGeneral);
            summary.set("totalTransactions", summary.getFloat("totalTransactions") + transactionsCreated);
            summary.set("scaerFeeTotal", summary.getFloat("scaerFeeTotal") + scaerFeeTotal);
            
            // Mergear breakdown
            let currentBreakdown = summary.get("clubBreakdown") || [];
            if (typeof currentBreakdown === 'string') {
                try { currentBreakdown = JSON.parse(currentBreakdown); } catch(e) { currentBreakdown = []; }
            }
            
            for (const clubId in clubBreakdownMap) {
                const b = clubBreakdownMap[clubId];
                const existing = currentBreakdown.find(x => x.clubId === clubId);
                if (existing) {
                    existing.amount += b.amount;
                    existing.transactionsCount += b.transactionsCount;
                } else {
                    currentBreakdown.push(b);
                }
            }
            summary.set("clubBreakdown", currentBreakdown);

        } else {
            summary = new Record(summaryCol);
            summary.set("billingPeriod", billingPeriod);
            summary.set("totalGeneral", totalGeneral);
            summary.set("totalCadets", totalCadetsProcessed);
            summary.set("totalTransactions", transactionsCreated);
            summary.set("clubBreakdown", Object.values(clubBreakdownMap));
            summary.set("scaerFeeTotal", scaerFeeTotal);
            summary.set("status", "open");
        }
        
        $app.save(summary);

        console.log(`Cron concluído. ${transactionsCreated} transações criadas para ${totalCadetsProcessed} cadetes.`);
    } catch (err) {
        console.error("Erro no cron_monthly_billing:", err);
    }
});
