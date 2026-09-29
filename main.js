import "dotenv/config"
import express from "express"
import axios from "axios"
import morgan from "morgan"
import { ChatGroq } from "@langchain/groq"
import { ChatOpenRouter } from "@langchain/openrouter"
import pool from "./configs/database.js"
import { createAgent, modelFallbackMiddleware } from "langchain"
import { tool } from "@langchain/core/tools"
import z from "zod"

const porta = process.env.PORT_SERVER
const app = express()

app.use(express.json())
app.use(morgan("dev"))

async function VerificarConexao() {
    try {
        const pegar = await pool.getConnection()
        console.log("Conectado com susseco!")
        pegar.release()
    } catch (error) {
        console.log(error)
    }
}

VerificarConexao()

const modeloGroq = new ChatGroq({
    model: "openai/gpt-oss-120b",
    temperature: 0.5 ,
    apiKey: process.env.API_GROQ
})

const modelosOpenrouter = new ChatOpenRouter({
    model: process.env.OPENROUTER_MODELO_1,
    temperature: 0.5,
    apiKey: process.env.API_ROUTER,
    models: [
        process.env.OPENROUTER_MODELO_2,
        process.env.OPENROUTER_MODELO_3,
        process.env.OPENROUTER_MODELO_4
    ],
    route: "fallback"
})

const toolBuscarInformacoes = tool(
    async function BuscarDados({ ticker }) {
        const { data } = await axios.get(`https://brapi.dev/api/v2/stocks/quote?symbols=${ticker}`, {
            headers: { "Authorization": `Bearer ${process.env.BRAPI_TOKEN}` }
        })
        console.log("passou pela tool buscarInformacoes")
        return data
    }, {
    name: "buscarInformacoes",
    description: "Busca informações atuais de uma ação brasileira, como cotação, variação, volume e demais informações disponibilizadas pela API. Use quando precisar de dados atuais de um ativo.",
    schema: z.object({
        ticker: z.string().describe("Ticker oficial do ativo ")
    })
}
)

const agentFinanceiro = createAgent({
    model: modelosOpenrouter,
    systemPrompt: "Você é um agente de IA especializado em economia, mercado financeiro, investimentos, análise fundamentalista, valuation, contabilidade, macroeconomia, microeconomia, política monetária, política fiscal, inflação, juros, câmbio, ciclos econômicos, história econômica e escolas de pensamento econômico; atue como um consultor experiente, natural, educado, objetivo e profissional; sua perspectiva econômica é favorável à propriedade privada, livre iniciativa, mercados competitivos, empreendedorismo, liberdade econômica, formação de preços por oferta e demanda, segurança jurídica e responsabilidade fiscal, porém nunca distorça fatos ou argumentos para defender essa perspectiva; ao discutir capitalismo, socialismo, comunismo ou outros sistemas econômicos, explique corretamente suas ideias, argumentos, diferenças entre teoria e aplicação histórica, críticas, contrapontos e evidências disponíveis; ao analisar investimentos considere preço, valor de mercado, receita, lucro, crescimento, margens, geração de caixa, dívida, patrimônio, ROE, ROIC, P/L, P/VP, EV/EBITDA, dividend yield, payout e demais dados disponíveis, nunca avaliando uma empresa por apenas um indicador e sempre diferenciando a qualidade da empresa do preço da ação; você possui as ferramentas buscarInformacoes, usada para consultar informações atuais e fundamentalistas de um ativo sempre utilize as ferramentas quando uma resposta depender de dados atuais e nunca invente preços, indicadores, balanços, dividendos, notícias ou informações não retornadas pelas ferramentas; informações retornadas pelas ferramentas têm prioridade sobre informações potencialmente desatualizadas do seu conhecimento; diferencie fatos, cálculos, interpretações e hipóteses; nunca trate previsões como certezas e deixe claras as premissas, riscos e incertezas relevantes; desempenho passado não garante desempenho futuro; durante as conversas identifique e guarde, quando houver mecanismo de memória disponível, somente informações necessárias e úteis sobre o cliente para atendimentos futuros, como objetivos financeiros, horizonte de investimento, nível de conhecimento, tolerância a risco, preferência por dividendos, crescimento ou preservação de patrimônio, ativos e setores de interesse, estratégias e preferências de análise; utilize essas informações naturalmente em conversas futuras, não pergunte novamente informações já disponíveis, não presuma informações que o cliente não informou e nunca armazene senhas, credenciais, dados bancários, documentos ou informações pessoais desnecessárias; responda sempre de forma curta, rápida, objetiva, clara, natural e educada, começando pela informação mais importante e aprofundando apenas quando solicitado ou necessário; utilize emojis de forma natural quando forem úteis, como 📈 para crescimento, 📉 para queda, 💰 para valores e dividendos, ⚠️ para riscos, 🏦 para juros e bancos, 📊 para análises, 💡 para explicações e ✅ para confirmações, evitando exageros e normalmente utilizando apenas 1 ou 2 emojis por resposta.",
    middleware: [
        modelFallbackMiddleware(modeloGroq)
    ],
    tools: [
        toolBuscarInformacoes
    ]
})

app.post("/conversa/:nome_conversa", async (req, res) => {
    try {
        const { pergunta } = req.body
        const { nome_conversa } = req.params

        const [nomeConversas] = await pool.execute(
            "select id_conversa , nome from conversas where nome = ?;",
            [nome_conversa]
        )

        if (nomeConversas.length === 0) {
            await pool.execute(
                "insert into conversas (nome) values (?);",
                [nome_conversa]
            )
            console.log("Criando nova conversa!")
        }

        const [contextoHistorico] = await pool.execute(
            "select role , content from menssagens inner join conversas on conversas.id_conversa = menssagens.id_conversa and conversas.nome = ?;",
            [nome_conversa]
        )

        const resposta = await agentFinanceiro.invoke({
            messages: [
                ...contextoHistorico,
                {
                    role: "user",
                    content: pergunta
                }
            ]
        })

        const [[idFKconversa]] = await pool.execute(
            "select id_conversa from conversas where nome = ?",
            [nome_conversa]
        )

        await pool.execute(
            "insert into menssagens (role , content , id_conversa) values (? , ? , ?);",
            ["user", pergunta, idFKconversa.id_conversa]
        )

        await pool.execute(
            "insert into menssagens (role , content , id_conversa) values (? , ? , ?);",
            ["assistant", resposta.messages.at(-1).content, idFKconversa.id_conversa]
        )

        return res.status(200).json({ Agent: resposta.messages.at(-1).content })
    } catch (error) {
        console.log(error)
    }
})

app.get("/conversa/:nome_conversa/historico", async (req, res) => {
    try {
        const { nome_conversa } = req.params

        const [menssagenes] = await pool.execute(
            "select conversas.nome , menssagens.role , menssagens.content from conversas inner join menssagens on conversas.id_conversa = menssagens.id_conversa and nome = ?; ",
            [nome_conversa]
        )

        if (menssagenes.length === 0) {
            return res.status(404).json({ Resposta: "Conversa não encontrada ou inexistente!" })
        }

        return res.status(200).json({ historico: menssagenes })
    } catch (error) {
        console.log(error)
    }
})

app.use((req, res, next) => { res.status(404).json({ "Resposta": "Rota não encontrada!" }) })

app.listen(porta, () => {
    console.log("http://localhost:" + porta)
})