# See LICENSE file for full copyright and licensing details.
{
    "name": "Analytic Accounts based Financial Reports",
    "version": "13.0.1.0.0",
    "summary": "Trial Balance ,Balance Sheet and Profit & Loss Plant Wise",
    "sequence": 15,
    "description": """
                    Accouning Reports, All in one Accouning for Trial Balance, Balance Sheet, Profit and Loss based on Analytic Accounts,
                    """,
    "category": "Accounting/Accounting",
    "author": "Foss Infotech",
    "maintainer": "Foss Infotech Pvt Ltd",
    "website": "http://www.fossinfotech.com/",
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
