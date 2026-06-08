import { getDashboardData } from "@/lib/db";
import Dashboard, { type NotaPayload } from "../Dashboard";

export const revalidate = 60;

export default async function DashboardPage() {
  const { notas: rows, gastoCategoria, inflacao } = await getDashboardData();
  const notas: NotaPayload[] = rows.map((n) => ({
    id: n.id,
    numero: n.numero,
    serie: n.serie,
    data_emissao: n.data_emissao,
    emitente: n.emitente,
    cnpj: n.cnpj,
    valor_total: n.valor_total,
    chave_acesso: n.chave_acesso,
    creditos: n.creditos,
    situacao_credito: n.situacao_credito,
    fonte: n.fonte,
    itens: n.itens.map((i) => ({
      id: i.id,
      produto: i.produto,
      codigo: i.codigo,
      qt: i.qt,
      un: i.un,
      vu: i.vu,
      vt: i.vt,
    })),
  }));
  return (
    <Dashboard
      notas={notas}
      gastoCategoria={gastoCategoria}
      inflacao={inflacao}
    />
  );
}
