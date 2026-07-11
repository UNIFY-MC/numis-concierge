import EstojoDetalhe from '@/components/EstojoDetalhe'

export default async function EstojoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <EstojoDetalhe id={id} />
}
