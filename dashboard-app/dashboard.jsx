import React, { useState, useMemo } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";

const DATA = [{"data": "06/02/2026", "prod": "REF.COCA-COLA PET", "qt": 2, "un": "UND", "vu": 11.99, "vt": 23.98, "nota": 17193}, {"data": "06/02/2026", "prod": "ENERGETICO MONSTER", "qt": 1, "un": "UND", "vu": 8.89, "vt": 8.89, "nota": 17193}, {"data": "06/02/2026", "prod": "ENERG.MONSTER LATA", "qt": 1, "un": "UND", "vu": 8.89, "vt": 8.89, "nota": 17193}, {"data": "06/02/2026", "prod": "NESCAFE MATINAL VDO", "qt": 1, "un": "UND", "vu": 39.9, "vt": 39.9, "nota": 17193}, {"data": "06/02/2026", "prod": "QUEIJO RALADO", "qt": 4, "un": "UND", "vu": 3.39, "vt": 13.56, "nota": 17193}, {"data": "06/02/2026", "prod": "CALDO SAZON COSTELA", "qt": 1, "un": "UND", "vu": 2.19, "vt": 2.19, "nota": 17193}, {"data": "06/02/2026", "prod": "PAO FORMA KIM", "qt": 1, "un": "UND", "vu": 5.49, "vt": 5.49, "nota": 17193}, {"data": "06/02/2026", "prod": "ERVILHA/MILHO BONARE", "qt": 3, "un": "UND", "vu": 3.79, "vt": 11.37, "nota": 17193}, {"data": "06/02/2026", "prod": "OVO BCO GD PVC", "qt": 1, "un": "BDJ", "vu": 9.9, "vt": 9.9, "nota": 17193}, {"data": "06/02/2026", "prod": "CREME LEITE PIRACAMJ", "qt": 3, "un": "UND", "vu": 4.79, "vt": 14.37, "nota": 17193}, {"data": "06/02/2026", "prod": "MIX P/REFOGAR KITANO", "qt": 1, "un": "UND", "vu": 6.5, "vt": 6.5, "nota": 17193}, {"data": "06/02/2026", "prod": "BISC.TRAKINAS RECH.", "qt": 3, "un": "UND", "vu": 3.25, "vt": 9.75, "nota": 17193}, {"data": "06/02/2026", "prod": "MOLHO TOM.SALSARETTI", "qt": 4, "un": "UND", "vu": 3.99, "vt": 15.96, "nota": 17193}, {"data": "06/02/2026", "prod": "FLOCAO MARATA", "qt": 4, "un": "UND", "vu": 2.49, "vt": 9.96, "nota": 17193}, {"data": "06/02/2026", "prod": "MAC.D.BENTA OVO", "qt": 2, "un": "PCT", "vu": 3.29, "vt": 6.58, "nota": 17193}, {"data": "06/02/2026", "prod": "ABS.ALWAYS NOT.SUAVE", "qt": 1, "un": "UND", "vu": 19.9, "vt": 19.9, "nota": 17193}, {"data": "06/02/2026", "prod": "TOALHA PAPEL KLASS", "qt": 1, "un": "UND", "vu": 4.49, "vt": 4.49, "nota": 17193}, {"data": "06/02/2026", "prod": "MAC.ADRIA PENA", "qt": 2, "un": "PCT", "vu": 3.59, "vt": 7.18, "nota": 17193}, {"data": "06/02/2026", "prod": "CEBOLA ATACADAO", "qt": 0.495, "un": "KG", "vu": 3.29, "vt": 1.63, "nota": 17193}, {"data": "06/02/2026", "prod": "PIMENTAO AMARELO", "qt": 0.18, "un": "KG", "vu": 18.9, "vt": 3.4, "nota": 17193}, {"data": "06/02/2026", "prod": "DET.LIQ.YPE", "qt": 2, "un": "UND", "vu": 1.99, "vt": 3.98, "nota": 17193}, {"data": "06/02/2026", "prod": "PEITO FGO PERDIGAO F", "qt": 0.306, "un": "KG", "vu": 59.9, "vt": 18.33, "nota": 17193}, {"data": "06/02/2026", "prod": "MUSS. SOBERANO FAT", "qt": 0.402, "un": "KG", "vu": 42.9, "vt": 17.25, "nota": 17193}, {"data": "06/02/2026", "prod": "CAMARAO S/CABECA", "qt": 3, "un": "UND", "vu": 24.9, "vt": 74.7, "nota": 17193}, {"data": "06/02/2026", "prod": "BIG CHICKEN PERDIGAO", "qt": 1, "un": "PCT", "vu": 26.5, "vt": 26.5, "nota": 17193}, {"data": "06/02/2026", "prod": "PAPEL HIG.RESIDENCE", "qt": 1, "un": "UND", "vu": 17.9, "vt": 17.9, "nota": 17193}, {"data": "06/02/2026", "prod": "POLPA NORTE", "qt": 4, "un": "UND", "vu": 2.29, "vt": 9.16, "nota": 17193}, {"data": "06/02/2026", "prod": "POLPA NORTE FRUTAS V", "qt": 6, "un": "UND", "vu": 3.19, "vt": 19.14, "nota": 17193}, {"data": "06/02/2026", "prod": "MANTEIGA PRESIDENT", "qt": 1, "un": "UND", "vu": 12.9, "vt": 12.9, "nota": 17193}, {"data": "06/02/2026", "prod": "TOALHA UMED.SELECT", "qt": 1, "un": "UND", "vu": 7.99, "vt": 7.99, "nota": 17193}, {"data": "08/12/2025", "prod": "MOLHO TOM.TOMADORO", "qt": 6, "un": "UND", "vu": 1.35, "vt": 8.1, "nota": 4345}, {"data": "08/12/2025", "prod": "SARD.88 RALADA", "qt": 5, "un": "UND", "vu": 3.99, "vt": 19.95, "nota": 4345}, {"data": "08/12/2025", "prod": "SELETA LEGUMES BONAR", "qt": 5, "un": "UND", "vu": 3.99, "vt": 19.95, "nota": 4345}, {"data": "08/12/2025", "prod": "SORBET ACAI MARESIA", "qt": 1, "un": "UND", "vu": 19.9, "vt": 19.9, "nota": 4345}, {"data": "08/12/2025", "prod": "POLPA NORTE", "qt": 4, "un": "UND", "vu": 2.29, "vt": 9.16, "nota": 4345}, {"data": "08/12/2025", "prod": "POLPA NORTE", "qt": 4, "un": "UND", "vu": 2.15, "vt": 8.6, "nota": 4345}, {"data": "08/12/2025", "prod": "POLPA NORTE", "qt": 4, "un": "UND", "vu": 5.7, "vt": 22.8, "nota": 4345}, {"data": "08/12/2025", "prod": "POLPA NORTE", "qt": 4, "un": "UND", "vu": 2.19, "vt": 8.76, "nota": 4345}, {"data": "08/12/2025", "prod": "POLPA NORTE", "qt": 4, "un": "UND", "vu": 2.99, "vt": 11.96, "nota": 4345}, {"data": "08/12/2025", "prod": "POLPA NORTE FRUTAS V", "qt": 3, "un": "UND", "vu": 3.19, "vt": 9.57, "nota": 4345}, {"data": "08/12/2025", "prod": "RF.LEITE FERM.CHAMYT", "qt": 2, "un": "UND", "vu": 2.99, "vt": 5.98, "nota": 4345}, {"data": "08/12/2025", "prod": "LEITE FERM.CORPUS", "qt": 1, "un": "UND", "vu": 13.9, "vt": 13.9, "nota": 4345}, {"data": "08/12/2025", "prod": "AGUA M.MONTEIRO LOBA", "qt": 1, "un": "UND", "vu": 1.19, "vt": 1.19, "nota": 4345}, {"data": "08/12/2025", "prod": "QUEIJO RALADO", "qt": 5, "un": "UND", "vu": 3.35, "vt": 16.75, "nota": 4345}, {"data": "08/12/2025", "prod": "FLOCAO MARATA", "qt": 4, "un": "UND", "vu": 2.39, "vt": 9.56, "nota": 4345}, {"data": "08/12/2025", "prod": "DET.LIQ.YPE", "qt": 2, "un": "UND", "vu": 2.45, "vt": 4.9, "nota": 4345}, {"data": "08/12/2025", "prod": "CATCHUP BONARE ZERO", "qt": 1, "un": "UND", "vu": 6.99, "vt": 6.99, "nota": 4345}, {"data": "08/12/2025", "prod": "MAION.HELLMANNS", "qt": 1, "un": "UND", "vu": 10.9, "vt": 10.9, "nota": 4345}, {"data": "08/12/2025", "prod": "PATE ATUM COQUEIRO", "qt": 1, "un": "UND", "vu": 9.9, "vt": 9.9, "nota": 4345}, {"data": "08/12/2025", "prod": "LAVA R.LIQ.TIXAN RF", "qt": 1, "un": "UND", "vu": 10.99, "vt": 10.99, "nota": 4345}, {"data": "08/12/2025", "prod": "SACO LIXO EMBALIXO", "qt": 1, "un": "UND", "vu": 15.89, "vt": 15.89, "nota": 4345}, {"data": "08/12/2025", "prod": "SACO LIXO TOP IM GRE", "qt": 1, "un": "UND", "vu": 14.68, "vt": 14.68, "nota": 4345}, {"data": "08/12/2025", "prod": "BOV.MUSCULO RESERVA", "qt": 1.992, "un": "KG", "vu": 39.9, "vt": 79.48, "nota": 4345}, {"data": "08/12/2025", "prod": "AMAC.ROUPA DOWNY", "qt": 1, "un": "UND", "vu": 12.5, "vt": 12.5, "nota": 4345}, {"data": "08/12/2025", "prod": "CAFE CERRADO MINEIRO", "qt": 1, "un": "PCT", "vu": 28.9, "vt": 28.9, "nota": 4345}, {"data": "08/12/2025", "prod": "MANDIOQUINHA", "qt": 0.785, "un": "KG", "vu": 12.9, "vt": 10.13, "nota": 4345}, {"data": "08/12/2025", "prod": "BATATA LAVADA", "qt": 1.73, "un": "KG", "vu": 3.95, "vt": 6.83, "nota": 4345}, {"data": "08/12/2025", "prod": "PIMENTAO VERDE", "qt": 0.385, "un": "KG", "vu": 13.9, "vt": 5.35, "nota": 4345}, {"data": "08/12/2025", "prod": "LIMAO TAITI TROPICAL", "qt": 0.665, "un": "KG", "vu": 4.25, "vt": 2.83, "nota": 4345}, {"data": "08/12/2025", "prod": "MILHO PIPOCA", "qt": 1, "un": "UND", "vu": 4.19, "vt": 4.19, "nota": 4345}, {"data": "08/12/2025", "prod": "MANT.ITAMBE C/S POT", "qt": 1, "un": "UND", "vu": 25.3, "vt": 25.3, "nota": 4345}, {"data": "08/12/2025", "prod": "ALHO S.ALHO POTE", "qt": 1, "un": "UND", "vu": 3.59, "vt": 3.59, "nota": 4345}, {"data": "08/12/2025", "prod": "COMP.LACTEO NINHO", "qt": 1, "un": "UND", "vu": 26.5, "vt": 26.5, "nota": 4345}, {"data": "08/12/2025", "prod": "RF.LING.T.CALAB.SEAR", "qt": 1, "un": "PCT", "vu": 12.9, "vt": 12.9, "nota": 4345}, {"data": "08/12/2025", "prod": "SAB.JOHNSONS", "qt": 2, "un": "UND", "vu": 5.9, "vt": 11.8, "nota": 4345}, {"data": "08/12/2025", "prod": "T.MANCHAS PO VANISH", "qt": 1, "un": "UND", "vu": 21.49, "vt": 21.49, "nota": 4345}, {"data": "08/12/2025", "prod": "CEBOLA ATACADAO", "qt": 0.73, "un": "KG", "vu": 2.85, "vt": 2.08, "nota": 4345}, {"data": "08/12/2025", "prod": "DIFUSOR AROMAS SECAR", "qt": 1, "un": "UND", "vu": 10.9, "vt": 10.9, "nota": 4345}, {"data": "08/12/2025", "prod": "DESOD.SANIT.HARPIC", "qt": 1, "un": "UND", "vu": 12.9, "vt": 12.9, "nota": 4345}, {"data": "08/12/2025", "prod": "FARINHA MAND.YOKI", "qt": 1, "un": "UND", "vu": 7.99, "vt": 7.99, "nota": 4345}, {"data": "08/12/2025", "prod": "FAR.LACTEA NESTLE", "qt": 1, "un": "UND", "vu": 8.99, "vt": 8.99, "nota": 4345}, {"data": "08/12/2025", "prod": "ERVILHA CAMPO BELO", "qt": 1, "un": "UND", "vu": 6.99, "vt": 6.99, "nota": 4345}, {"data": "08/12/2025", "prod": "PALMITO P.REAL INT.", "qt": 1, "un": "UND", "vu": 15.8, "vt": 15.8, "nota": 4345}, {"data": "08/12/2025", "prod": "CALDO SAZON PICANHA", "qt": 1, "un": "UND", "vu": 2.19, "vt": 2.19, "nota": 4345}, {"data": "08/12/2025", "prod": "CALDO SAZON COSTELA", "qt": 1, "un": "UND", "vu": 2.19, "vt": 2.19, "nota": 4345}, {"data": "08/12/2025", "prod": "L.COND.ITALAC ZERO L", "qt": 1, "un": "UND", "vu": 7.99, "vt": 7.99, "nota": 4345}, {"data": "08/12/2025", "prod": "QJO.PRATO AURORA FAT", "qt": 0.416, "un": "KG", "vu": 49.9, "vt": 20.76, "nota": 4345}, {"data": "08/12/2025", "prod": "LUVA CELESTE LATEX G", "qt": 2, "un": "PAR", "vu": 3.69, "vt": 7.38, "nota": 4345}, {"data": "08/12/2025", "prod": "FILTRO.CAFE BRIGITT", "qt": 1, "un": "UND", "vu": 3.59, "vt": 3.59, "nota": 4345}, {"data": "08/12/2025", "prod": "GOMA MANDIOCA TERRIN", "qt": 2, "un": "UND", "vu": 9.99, "vt": 19.98, "nota": 4345}, {"data": "08/12/2025", "prod": "PAPEL HIG.RESIDENCE", "qt": 1, "un": "UND", "vu": 16.2, "vt": 16.2, "nota": 4345}, {"data": "08/12/2025", "prod": "MAC.FLORI ESPAG.OVO", "qt": 4, "un": "UND", "vu": 2.49, "vt": 9.96, "nota": 4345}, {"data": "08/12/2025", "prod": "TOALHA UMED.SELECT", "qt": 1, "un": "UND", "vu": 7.79, "vt": 7.79, "nota": 4345}, {"data": "08/12/2025", "prod": "BISC.CLUB SOCIAL REQ", "qt": 1, "un": "UND", "vu": 5.98, "vt": 5.98, "nota": 4345}, {"data": "08/12/2025", "prod": "BISC.CLUB SOCIAL REC", "qt": 1, "un": "UND", "vu": 5.98, "vt": 5.98, "nota": 4345}, {"data": "08/12/2025", "prod": "CHA MATTE LEAO", "qt": 1, "un": "CXT", "vu": 6.49, "vt": 6.49, "nota": 4345}, {"data": "08/12/2025", "prod": "CHA OETKER ERVA DOCE", "qt": 1, "un": "UND", "vu": 3.99, "vt": 3.99, "nota": 4345}, {"data": "08/12/2025", "prod": "FL.ALUM.30X4M PRATSY", "qt": 1, "un": "UND", "vu": 3.99, "vt": 3.99, "nota": 4345}, {"data": "08/12/2025", "prod": "ESC.DENTAL COLGATE", "qt": 1, "un": "UND", "vu": 25.9, "vt": 25.9, "nota": 4345}, {"data": "08/12/2025", "prod": "BISC.RANCHEIRO", "qt": 2, "un": "PCT", "vu": 1.98, "vt": 3.96, "nota": 4345}, {"data": "08/12/2025", "prod": "BISC.TRIUNFO TORTINI", "qt": 1, "un": "UND", "vu": 2.1, "vt": 2.1, "nota": 4345}, {"data": "08/12/2025", "prod": "BISC.BAUDUCCO", "qt": 1, "un": "PCT", "vu": 2.39, "vt": 2.39, "nota": 4345}, {"data": "08/12/2025", "prod": "AZEITE ANDOR.EX.VIRG", "qt": 1, "un": "GFA", "vu": 29.8, "vt": 29.8, "nota": 4345}, {"data": "08/12/2025", "prod": "MAC.INST.C.NOODLES B", "qt": 1, "un": "UND", "vu": 5.49, "vt": 5.49, "nota": 4345}, {"data": "08/12/2025", "prod": "REFR.PO TANG", "qt": 6, "un": "UND", "vu": 1.45, "vt": 8.7, "nota": 4345}, {"data": "08/12/2025", "prod": "MAC.NISSIN T.MONICA", "qt": 2, "un": "UND", "vu": 2.89, "vt": 5.78, "nota": 4345}, {"data": "08/12/2025", "prod": "BISC.TRAKINAS RECH.", "qt": 1, "un": "UND", "vu": 3.3, "vt": 3.3, "nota": 4345}, {"data": "08/12/2025", "prod": "SHAMP.NEUTROX", "qt": 1, "un": "UND", "vu": 11.9, "vt": 11.9, "nota": 4345}, {"data": "08/12/2025", "prod": "COND.NEUTROX", "qt": 1, "un": "UND", "vu": 15, "vt": 15, "nota": 4345}, {"data": "08/12/2025", "prod": "DESENT.DIABO VERDE", "qt": 1, "un": "UND", "vu": 17.9, "vt": 17.9, "nota": 4345}, {"data": "08/12/2025", "prod": "MIST.BOLO CHOC AVELA", "qt": 1, "un": "UND", "vu": 7.49, "vt": 7.49, "nota": 4345}, {"data": "08/12/2025", "prod": "MIST.BOLO D.BENTA", "qt": 1, "un": "UND", "vu": 7.49, "vt": 7.49, "nota": 4345}, {"data": "08/12/2025", "prod": "TOALHA PAPEL KITCHEN", "qt": 1, "un": "UND", "vu": 5.85, "vt": 5.85, "nota": 4345}, {"data": "08/12/2025", "prod": "ARROZ SOLITO T.1", "qt": 1, "un": "PCT", "vu": 16, "vt": 16, "nota": 4345}, {"data": "08/12/2025", "prod": "CERVEJA BADEN CRISTA", "qt": 1, "un": "EMB", "vu": 32.94, "vt": 32.94, "nota": 4345}, {"data": "21/05/2026", "prod": "FR.QJO.PRATO IPAN F.", "qt": 0.398, "un": "KG", "vu": 56.9, "vt": 22.65, "nota": 30439}, {"data": "21/05/2026", "prod": "PAO FORMA VISCONTI", "qt": 1, "un": "UND", "vu": 7.89, "vt": 7.89, "nota": 30439}, {"data": "21/05/2026", "prod": "MIST.BOLO FLEISCHMAN", "qt": 1, "un": "UND", "vu": 8.78, "vt": 8.78, "nota": 30439}, {"data": "21/05/2026", "prod": "CHA LEAO", "qt": 1, "un": "UND", "vu": 7.48, "vt": 7.48, "nota": 30439}, {"data": "21/05/2026", "prod": "CHA DR OETKER", "qt": 1, "un": "UND", "vu": 7.58, "vt": 7.58, "nota": 30439}, {"data": "21/05/2026", "prod": "CHA LEAO HORTELA", "qt": 1, "un": "UND", "vu": 3.28, "vt": 3.28, "nota": 30439}, {"data": "21/05/2026", "prod": "CHA LEAO ICE TEA", "qt": 1, "un": "UND", "vu": 10.98, "vt": 10.98, "nota": 30439}, {"data": "21/05/2026", "prod": "OVO GALINHAS LIVRE", "qt": 1, "un": "BDJ", "vu": 18.9, "vt": 18.9, "nota": 30439}, {"data": "21/05/2026", "prod": "KIWI", "qt": 1, "un": "BDJ", "vu": 12.5, "vt": 12.5, "nota": 30439}, {"data": "21/05/2026", "prod": "GOMA MANDIOCA TERRIN", "qt": 2, "un": "UND", "vu": 7.98, "vt": 15.96, "nota": 30439}, {"data": "21/05/2026", "prod": "HF.UVA THOMPSON BDJ", "qt": 1, "un": "BDJ", "vu": 11.9, "vt": 11.9, "nota": 30439}, {"data": "21/05/2026", "prod": "BOV.ACEM S/OSSO RESE", "qt": 1.02, "un": "KG", "vu": 37.9, "vt": 38.66, "nota": 30439}, {"data": "21/05/2026", "prod": "IOGURTE FRUTAP", "qt": 1, "un": "UND", "vu": 12.9, "vt": 12.9, "nota": 30439}, {"data": "21/05/2026", "prod": "GELATINA DR.OETKER", "qt": 1, "un": "UND", "vu": 1.45, "vt": 1.45, "nota": 30439}, {"data": "21/05/2026", "prod": "GELATINA DR.OETKER", "qt": 1, "un": "UND", "vu": 1.45, "vt": 1.45, "nota": 30439}, {"data": "21/05/2026", "prod": "RF.MANT.TOURINHO", "qt": 2, "un": "UND", "vu": 16.9, "vt": 33.8, "nota": 30439}, {"data": "21/05/2026", "prod": "CHOC.NESTLE KIT KAT", "qt": 1, "un": "PCT", "vu": 2.99, "vt": 2.99, "nota": 30439}, {"data": "29/04/2026", "prod": "BATATA BULNEZ", "qt": 1, "un": "UND", "vu": 23.9, "vt": 23.9, "nota": 34472}, {"data": "29/04/2026", "prod": "IOGURTE FRUTAP", "qt": 1, "un": "UND", "vu": 12.9, "vt": 12.9, "nota": 34472}, {"data": "29/04/2026", "prod": "SUCO MARATA NECTAR", "qt": 1, "un": "UND", "vu": 5.09, "vt": 5.09, "nota": 34472}, {"data": "29/04/2026", "prod": "SUCO MARATA MARACUJA", "qt": 1, "un": "UND", "vu": 5.09, "vt": 5.09, "nota": 34472}, {"data": "29/04/2026", "prod": "PASSATA SACCIALI VD", "qt": 1, "un": "UND", "vu": 10.49, "vt": 10.49, "nota": 34472}, {"data": "29/04/2026", "prod": "LEITE L. VIDA NINHO", "qt": 2, "un": "UND", "vu": 6.99, "vt": 13.98, "nota": 34472}, {"data": "29/04/2026", "prod": "MANTEIGA AVIACAO", "qt": 1, "un": "PTE", "vu": 8.97, "vt": 8.97, "nota": 34472}, {"data": "29/04/2026", "prod": "QUEIJO TIPO BRIE TIR", "qt": 0.14, "un": "KG", "vu": 112, "vt": 15.68, "nota": 34472}, {"data": "29/04/2026", "prod": "PACOCA DACOLONIA", "qt": 1, "un": "UND", "vu": 9.98, "vt": 9.98, "nota": 34472}, {"data": "29/04/2026", "prod": "HF.UVA VITORIA", "qt": 1, "un": "BDJ", "vu": 9.9, "vt": 9.9, "nota": 34472}, {"data": "29/04/2026", "prod": "MAC.PETYBON COLOR", "qt": 1, "un": "PCT", "vu": 7, "vt": 7, "nota": 34472}, {"data": "29/04/2026", "prod": "KIWI", "qt": 2, "un": "BDJ", "vu": 8.99, "vt": 17.98, "nota": 34472}, {"data": "29/04/2026", "prod": "PEITO PERU MARBA FAT", "qt": 0.22, "un": "KG", "vu": 62.9, "vt": 13.84, "nota": 34472}, {"data": "29/04/2026", "prod": "QJO. CHEDDAR PROC.VI", "qt": 0.236, "un": "KG", "vu": 56.9, "vt": 13.43, "nota": 34472}, {"data": "29/04/2026", "prod": "LEITE PO ITALAC", "qt": 1, "un": "UND", "vu": 13.85, "vt": 13.85, "nota": 34472}, {"data": "29/04/2026", "prod": "GOMA MANDIOCA TERRIN", "qt": 1, "un": "UND", "vu": 12.99, "vt": 12.99, "nota": 34472}, {"data": "29/04/2026", "prod": "OVO GALINHAS LIVRE", "qt": 1, "un": "BDJ", "vu": 12.99, "vt": 12.99, "nota": 34472}, {"data": "29/04/2026", "prod": "DOCE LEITE ITAMBE", "qt": 1, "un": "UND", "vu": 10.9, "vt": 10.9, "nota": 34472}, {"data": "29/04/2026", "prod": "MOLHO BILLY JACK", "qt": 1, "un": "UND", "vu": 4.99, "vt": 4.99, "nota": 34472}, {"data": "29/04/2026", "prod": "MOLHO BILLY JACK", "qt": 1, "un": "UND", "vu": 4.99, "vt": 4.99, "nota": 34472}, {"data": "29/04/2026", "prod": "BANANA PRATA", "qt": 0.92, "un": "KG", "vu": 9.9, "vt": 9.11, "nota": 34472}, {"data": "29/04/2026", "prod": "BANANA NANICA", "qt": 1.25, "un": "KG", "vu": 6.99, "vt": 8.74, "nota": 34472}, {"data": "29/04/2026", "prod": "ERVILHA/MILHO BONARE", "qt": 3, "un": "UND", "vu": 3.79, "vt": 11.37, "nota": 34472}, {"data": "29/04/2026", "prod": "CEREAL MAT.NESTLE", "qt": 1, "un": "UND", "vu": 9.39, "vt": 9.39, "nota": 34472}];

const BRL = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const NUM = (v) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 3 });
const parseD = (s) => { const [d, m, y] = s.split("/"); return new Date(+y, +m - 1, +d); };

const C = { bg:"#0d0f0e", panel:"#161a18", panel2:"#1d2320", line:"#2a312d", ink:"#eef1ee", muted:"#8a9690", accent:"#d4ff4f", accent2:"#5fb89a", warn:"#ff7a59" };

export default function Dashboard() {
  const notas = useMemo(() => {
    const m = {};
    DATA.forEach(r => { if(!m[r.nota]) m[r.nota]={nota:r.nota,data:r.data,total:0,itens:0}; m[r.nota].total+=r.vt; m[r.nota].itens++; });
    return Object.values(m).sort((a,b)=>parseD(a.data)-parseD(b.data));
  }, []);

  const comp = useMemo(() => {
    const m = {};
    DATA.forEach(r => { if(!m[r.prod]) m[r.prod]={prod:r.prod,vus:[],vt:0}; m[r.prod].vus.push(r.vu); m[r.prod].vt+=r.vt; });
    return Object.values(m).map(p => {
      const min=Math.min(...p.vus), max=Math.max(...p.vus), avg=p.vus.reduce((a,b)=>a+b,0)/p.vus.length;
      return {prod:p.prod,min,max,avg,n:p.vus.length,vt:p.vt,varp:min?(max-min)/min:0,varAbs:max-min};
    });
  }, []);

  const totalGasto = DATA.reduce((a,r)=>a+r.vt,0);
  const maisCaro = [...comp].sort((a,b)=>b.vt-a.vt)[0];
  const repItems = comp.filter(c=>c.n>1).map(c=>c.prod).sort();

  const [compFiltro, setCompFiltro] = useState("rep");
  const [compBusca, setCompBusca] = useState("");
  const [compSort, setCompSort] = useState({k:"varp",dir:-1});
  const [notaFiltro, setNotaFiltro] = useState("all");
  const [itemBusca, setItemBusca] = useState("");
  const [evoProd, setEvoProd] = useState(repItems[0]||"");

  const kpis = [
    {lbl:"Total gasto", val:BRL(totalGasto), note:`${notas.length} notas · ${DATA.length} itens`},
    {lbl:"Ticket médio", val:BRL(totalGasto/notas.length), note:"por nota fiscal"},
    {lbl:"Produtos distintos", val:comp.length, note:`${repItems.length} comprados +1 vez`},
    {lbl:"Item que mais pesou", val:BRL(maisCaro.vt), note:maisCaro.prod},
  ];

  const topData = [...comp].sort((a,b)=>b.vt-a.vt).slice(0,8).map(t=>({name:t.prod.length>16?t.prod.slice(0,15)+"…":t.prod, vt:t.vt}));
  const notasData = notas.map(n=>({name:n.data, total:n.total}));
  const evoData = DATA.filter(r=>r.prod===evoProd).sort((a,b)=>parseD(a.data)-parseD(b.data)).map(r=>({data:r.data, vu:r.vu}));

  const compRows = useMemo(() => {
    let rows = comp.filter(c => (compFiltro==="all"||c.n>1) && c.prod.toLowerCase().includes(compBusca.toLowerCase()));
    rows.sort((a,b)=>{ const x=a[compSort.k], y=b[compSort.k]; return (typeof x==="string"?x.localeCompare(y):x-y)*compSort.dir; });
    return rows;
  }, [comp, compFiltro, compBusca, compSort]);

  const itemRows = useMemo(() =>
    DATA.filter(r => (notaFiltro==="all"||r.nota==notaFiltro) && r.prod.toLowerCase().includes(itemBusca.toLowerCase()))
  , [notaFiltro, itemBusca]);

  const card = { background:C.panel, border:`1px solid ${C.line}`, borderRadius:16, padding:18, marginBottom:20 };
  const sel = { background:C.panel2, border:`1px solid ${C.line}`, color:C.ink, padding:"9px 12px", borderRadius:9, fontSize:14, outline:"none", width:"100%", marginBottom:8 };
  const th = { textAlign:"left", fontSize:10, letterSpacing:".06em", textTransform:"uppercase", color:C.muted, padding:"10px 10px", borderBottom:`1px solid ${C.line}`, cursor:"pointer", whiteSpace:"nowrap", fontFamily:"monospace" };
  const td = { padding:"10px 10px", borderBottom:`1px solid ${C.line}`, fontSize:13 };
  const numTd = {...td, textAlign:"right", fontFamily:"monospace"};

  const ChartTip = ({active, payload, fmt}) => active && payload && payload.length ?
    <div style={{background:C.panel2,border:`1px solid ${C.line}`,borderRadius:8,padding:"6px 10px",fontSize:12,color:C.ink}}>{fmt(payload[0].value)}</div> : null;

  return (
    <div style={{background:C.bg, color:C.ink, minHeight:"100vh", fontFamily:"system-ui, sans-serif", padding:"20px 14px 60px"}}>
      <div style={{maxWidth:760, margin:"0 auto"}}>
        <div style={{fontFamily:"monospace", fontSize:11, letterSpacing:".2em", textTransform:"uppercase", color:C.accent, marginBottom:10}}>Painel de Compras · NFC-e</div>
        <h1 style={{fontSize:34, fontWeight:800, lineHeight:1.05, letterSpacing:"-.02em", margin:"0 0 8px"}}>Onde foi <em style={{color:C.accent2}}>seu</em> dinheiro.</h1>
        <p style={{color:C.muted, fontSize:14, margin:"0 0 24px"}}>Base consolidada dos seus cupons fiscais.</p>

        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:24}}>
          {kpis.map((k,i)=>(
            <div key={i} style={{...card, marginBottom:0, padding:16, position:"relative", overflow:"hidden"}}>
              <div style={{position:"absolute",top:0,left:0,width:3,height:"100%",background:C.accent}}/>
              <div style={{fontFamily:"monospace",fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:C.muted}}>{k.lbl}</div>
              <div style={{fontSize:24,fontWeight:700,margin:"6px 0 2px",letterSpacing:"-.01em"}}>{k.val}</div>
              <div style={{fontSize:11,color:C.muted}}>{k.note}</div>
            </div>
          ))}
        </div>

        <div style={card}>
          <h3 style={{fontSize:15,fontWeight:600,margin:"0 0 2px"}}>Gasto por compra</h3>
          <p style={{fontSize:12,color:C.muted,margin:"0 0 14px"}}>Total de cada nota, por data.</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={notasData} margin={{top:4,right:4,left:4,bottom:4}}>
              <CartesianGrid stroke={C.line} vertical={false}/>
              <XAxis dataKey="name" tick={{fill:C.muted,fontSize:11}} axisLine={{stroke:C.line}} tickLine={false}/>
              <YAxis tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>"R$"+v}/>
              <Tooltip content={<ChartTip fmt={BRL}/>} cursor={{fill:"rgba(255,255,255,.04)"}}/>
              <Bar dataKey="total" fill={C.accent} radius={[6,6,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={card}>
          <h3 style={{fontSize:15,fontWeight:600,margin:"0 0 2px"}}>Onde o dinheiro foi</h3>
          <p style={{fontSize:12,color:C.muted,margin:"0 0 14px"}}>Top 8 produtos por valor total.</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topData} layout="vertical" margin={{top:4,right:8,left:4,bottom:4}}>
              <CartesianGrid stroke={C.line} horizontal={false}/>
              <XAxis type="number" tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>"R$"+v}/>
              <YAxis type="category" dataKey="name" tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false} width={108}/>
              <Tooltip content={<ChartTip fmt={BRL}/>} cursor={{fill:"rgba(255,255,255,.04)"}}/>
              <Bar dataKey="vt" fill={C.accent2} radius={[0,6,6,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {repItems.length > 0 && (
          <div style={card}>
            <h3 style={{fontSize:15,fontWeight:600,margin:"0 0 2px"}}>Evolução de preço</h3>
            <p style={{fontSize:12,color:C.muted,margin:"0 0 12px"}}>Preço unitário do mesmo item em datas diferentes.</p>
            <select style={sel} value={evoProd} onChange={e=>setEvoProd(e.target.value)}>
              {repItems.map(p=><option key={p} value={p}>{p}</option>)}
            </select>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={evoData} margin={{top:8,right:8,left:4,bottom:4}}>
                <CartesianGrid stroke={C.line} vertical={false}/>
                <XAxis dataKey="data" tick={{fill:C.muted,fontSize:11}} axisLine={{stroke:C.line}} tickLine={false}/>
                <YAxis tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>"R$"+v} domain={["auto","auto"]}/>
                <Tooltip content={<ChartTip fmt={BRL}/>}/>
                <Line type="monotone" dataKey="vu" stroke={C.accent} strokeWidth={2} dot={{fill:C.accent,r:5}}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <h2 style={{fontSize:20,fontWeight:700,margin:"30px 0 14px"}}><span style={{fontFamily:"monospace",fontSize:12,color:C.accent,marginRight:8}}>01</span>Comparação de preços</h2>
        <div style={card}>
          <select style={sel} value={compFiltro} onChange={e=>setCompFiltro(e.target.value)}>
            <option value="rep">Só itens comprados mais de uma vez</option>
            <option value="all">Todos os produtos</option>
          </select>
          <input style={sel} type="search" placeholder="Buscar produto…" value={compBusca} onChange={e=>setCompBusca(e.target.value)}/>
          <div style={{overflowX:"auto", maxHeight:420, overflowY:"auto"}}>
            <table style={{width:"100%", borderCollapse:"collapse", minWidth:480}}>
              <thead><tr>
                {[["prod","Produto"],["min","Mín"],["max","Máx"],["avg","Médio"],["varp","Variação"],["n","×"]].map(([k,l])=>(
                  <th key={k} style={th} onClick={()=>setCompSort(s=>({k, dir:s.k===k?-s.dir:-1}))}>{l}</th>
                ))}
              </tr></thead>
              <tbody>
                {compRows.map((c,i)=>(
                  <tr key={i}>
                    <td style={td}>{c.prod}</td>
                    <td style={numTd}>{BRL(c.min)}</td>
                    <td style={numTd}>{BRL(c.max)}</td>
                    <td style={numTd}>{BRL(c.avg)}</td>
                    <td style={{...numTd, color:c.varAbs>0.001?C.warn:C.muted}}>{c.varAbs>0.001?"▲ ":"• "}{(c.varp*100).toFixed(1)}%</td>
                    <td style={numTd}>{c.n}</td>
                  </tr>
                ))}
                {compRows.length===0 && <tr><td colSpan={6} style={{...td,textAlign:"center",color:C.muted,padding:24}}>Nenhum produto.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <h2 style={{fontSize:20,fontWeight:700,margin:"30px 0 14px"}}><span style={{fontFamily:"monospace",fontSize:12,color:C.accent,marginRight:8}}>02</span>Detalhe item a item</h2>
        <div style={card}>
          <select style={sel} value={notaFiltro} onChange={e=>setNotaFiltro(e.target.value)}>
            <option value="all">Todas as notas</option>
            {notas.map(n=><option key={n.nota} value={n.nota}>{n.data} · #{n.nota}</option>)}
          </select>
          <input style={sel} type="search" placeholder="Buscar produto…" value={itemBusca} onChange={e=>setItemBusca(e.target.value)}/>
          <div style={{overflowX:"auto", maxHeight:480, overflowY:"auto"}}>
            <table style={{width:"100%", borderCollapse:"collapse", minWidth:460}}>
              <thead><tr>
                {["Data","Produto","Qtde","Un","Vl.Unit.","Vl.Total"].map(l=><th key={l} style={th}>{l}</th>)}
              </tr></thead>
              <tbody>
                {itemRows.map((r,i)=>(
                  <tr key={i}>
                    <td style={td}>{r.data}</td>
                    <td style={td}>{r.prod}</td>
                    <td style={numTd}>{NUM(r.qt)}</td>
                    <td style={td}>{r.un}</td>
                    <td style={numTd}>{BRL(r.vu)}</td>
                    <td style={numTd}>{BRL(r.vt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p style={{color:C.muted,fontSize:11,textAlign:"center",marginTop:24,fontFamily:"monospace"}}>{notas.length} notas · {DATA.length} itens · NFC-e</p>
      </div>
    </div>
  );
}
