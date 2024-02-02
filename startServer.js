

export default function startServer (PORT, app) {
    app.listen(PORT, () => console.log(`Server is running on port ${PORT}`))
}

