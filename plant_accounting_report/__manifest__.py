# See LICENSE file for full copyright and licensing details.
{
    "name": "Plant Financial Reports",
    "version": "13.1.0.0",
    "summary": "Trial Balance ,Balance Sheet and Profit & Loss Plant Wise",
    "sequence": 15,
    "description": """
                    Odoo 13 Accouning Reports, Odoo 13 All in one Accouning for Trial Balance, Balance Sheet, Profit and Loss based on Plant Wise,
                    """,
    "category": "Accounting/Accounting",
    "author": "Serpent Consulting Services Pvt Ltd",
    "maintainer": "Serpent Consulting Services Pvt Ltd",
    "website": "https://www.serpentcs.com/",
    "depends": ["report_xlsx", "account_dynamic_reports"],
    "data": [
        "views/account_analytic_account_views.xml",
        "views/account_report_views.xml",
        "views/report_actions.xml",
        "wizard/trial_balance_view.xml",
        "wizard/financial_report_view.xml",
    ],
    "license": "LGPL-3",
    "qweb": ["static/src/xml/view.xml"],
    "installable": True,
    "auto_install": False,
}
