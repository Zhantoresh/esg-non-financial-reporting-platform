from .models import Recommendation, Answer

THRESHOLD = 0.5  # если скор меньше 50% от максимума — генерируем рекомендацию

CATEGORY_TIPS = {
    'E': [
        ('Снижение выбросов CO2', 'Рассмотрите внедрение программы по сокращению углеродного следа компании.'),
        ('Энергоэффективность', 'Проведите аудит энергопотребления и перейдите на возобновляемые источники энергии.'),
        ('Управление отходами', 'Внедрите систему раздельного сбора и переработки отходов.'),
    ],
    'S': [
        ('Развитие персонала', 'Инвестируйте в обучение и повышение квалификации сотрудников.'),
        ('Гендерное равенство', 'Разработайте политику равных возможностей и увеличьте долю женщин в руководстве.'),
        ('Социальная поддержка', 'Внедрите программы социальной поддержки и wellbeing для сотрудников.'),
    ],
    'G': [
        ('Прозрачность отчётности', 'Публикуйте ежегодные отчёты о корпоративном управлении в открытом доступе.'),
        ('Антикоррупционная политика', 'Разработайте и внедрите кодекс этики и антикоррупционную политику.'),
        ('Совет директоров', 'Обеспечьте независимость членов совета директоров и регулярный аудит.'),
    ],
}


def generate_recommendations(report):
    """
    Генерирует рекомендации для отчёта на основе низкоскоринговых ответов.
    Удаляет старые рекомендации и создаёт новые.
    """
    # Удаляем старые рекомендации
    report.recommendations.all().delete()

    # Выбираем ответы с низким скором
    low_score_answers = Answer.objects.filter(
        report=report
    ).select_related('question').filter(
        score__isnull=False
    )

    categories_needing_help = set()

    for answer in low_score_answers:
        q = answer.question
        if q.max_score > 0:
            ratio = answer.score / q.max_score
            if ratio < THRESHOLD:
                categories_needing_help.add(q.category)

    # Создаём рекомендации по каждой проблемной категории
    recommendations = []
    for category in categories_needing_help:
        tips = CATEGORY_TIPS.get(category, [])
        for priority, (title, description) in enumerate(tips[:2], start=1):
            recommendations.append(Recommendation(
                report=report,
                category=category,
                title=title,
                description=description,
                priority=priority,
            ))

    if recommendations:
        Recommendation.objects.bulk_create(recommendations)

    return recommendations